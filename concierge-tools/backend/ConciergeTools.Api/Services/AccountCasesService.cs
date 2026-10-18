
using ConciergeTools.Api.Models;
using Npgsql;
using NpgsqlTypes;

namespace ConciergeTools.Api.Services;

public class AccountCasesService
{
    private readonly NpgsqlDataSource _dataSource;

    public AccountCasesService(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<object> CreateAccountWithCasesAsync(
        CreateAccountWithCasesRequest request)
    {
        if (request.Cases is null || request.Cases.Count == 0)
        {
            throw new ArgumentException(
                "Add at least one case.");
        }

        foreach (var item in request.Cases)
        {
            if (string.IsNullOrWhiteSpace(item.CaseNumber))
            {
                throw new ArgumentException(
                    "Case number is required for every case.");
            }
        }

        var isNewAccount = request.AccountId is null;

        if (isNewAccount &&
            (request.Account is null ||
             string.IsNullOrWhiteSpace(request.Account.AccountName)))
        {
            throw new ArgumentException(
                "Account name is required for a new account.");
        }

        if (!isNewAccount && request.Account is not null)
        {
            throw new ArgumentException(
                "Provide an account ID or new account details, not both.");
        }

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            Guid accountId;

            if (isNewAccount)
            {
                var account = request.Account!;

                const string sql = """
                    INSERT INTO public.accounts (
                        account_name,
                        client_name,
                        client_email,
                        client_phone,
                        client_timezone,
                        sales_rep_name,
                        sales_rep_email,
                        sales_rep_phone
                    )
                    VALUES (
                        @accountName,
                        @clientName,
                        @clientEmail,
                        @clientPhone,
                        @clientTimezone,
                        @salesRepName,
                        @salesRepEmail,
                        @salesRepPhone
                    )
                    RETURNING id;
                    """;

                await using var command =
                    new NpgsqlCommand(sql, connection, transaction);

                command.Parameters.AddWithValue(
                    "accountName", account.AccountName.Trim());

                AddText(command, "clientName", account.ClientName);
                AddText(command, "clientEmail", account.ClientEmail);
                AddText(command, "clientPhone", account.ClientPhone);
                AddText(command, "clientTimezone", account.ClientTimezone);
                AddText(command, "salesRepName", account.SalesRepName);
                AddText(command, "salesRepEmail", account.SalesRepEmail);
                AddText(command, "salesRepPhone", account.SalesRepPhone);

                var result = await command.ExecuteScalarAsync();

                accountId = (Guid)(result
                    ?? throw new InvalidOperationException(
                        "Account was not created."));
            }
            else
            {
                accountId = request.AccountId!.Value;

                const string sql = """
                    SELECT EXISTS (
                        SELECT 1
                        FROM public.accounts
                        WHERE id = @accountId
                    );
                    """;

                await using var command =
                    new NpgsqlCommand(sql, connection, transaction);

                command.Parameters.AddWithValue("accountId", accountId);

                var result = await command.ExecuteScalarAsync();

                if (result is not true)
                {
                    throw new KeyNotFoundException("Account not found.");
                }
            }

            var caseIds = new List<Guid>();

            const string caseSql = """
                INSERT INTO public.cases (
                    account_id,
                    case_number,
                    product_type,
                    status,
                    order_deadline,
                    art_deadline,
                    mail_date,
                    notes
                )
                VALUES (
                    @accountId,
                    @caseNumber,
                    @productType,
                    'Pending Rep Action',
                    @orderDeadline,
                    @artDeadline,
                    @mailDate,
                    @notes
                )
                RETURNING id;
                """;

            foreach (var item in request.Cases)
            {
                await using var command =
                    new NpgsqlCommand(caseSql, connection, transaction);

                command.Parameters.AddWithValue("accountId", accountId);
                command.Parameters.AddWithValue(
                    "caseNumber", item.CaseNumber.Trim());

                AddText(command, "productType", item.ProductType);
                AddTimestamp(command, "orderDeadline", item.OrderDeadline);
                AddTimestamp(command, "artDeadline", item.ArtDeadline);
                AddTimestamp(command, "mailDate", item.MailDate);
                AddText(command, "notes", item.Notes);

                var result = await command.ExecuteScalarAsync();

                caseIds.Add((Guid)(result
                    ?? throw new InvalidOperationException(
                        "Case was not created.")));
            }

            await transaction.CommitAsync();

            return new
            {
                accountId,
                casesCreated = caseIds.Count,
                caseIds
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static void AddText(
        NpgsqlCommand command,
        string name,
        string? value)
    {
        command.Parameters.AddWithValue(
            name,
            NpgsqlDbType.Text,
            (object?)value ?? DBNull.Value);
    }

    private static void AddTimestamp(
        NpgsqlCommand command,
        string name,
        DateTimeOffset? value)
    {
        command.Parameters.AddWithValue(
            name,
            NpgsqlDbType.TimestampTz,
            (object?)value ?? DBNull.Value);
    }
}
