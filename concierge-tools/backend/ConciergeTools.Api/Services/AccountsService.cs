
using ConciergeTools.Api.Models;
using Npgsql;

namespace ConciergeTools.Api.Services;

public class AccountsService
{
    private readonly NpgsqlDataSource _dataSource;

    public AccountsService(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<List<AccountResponse>> GetAccountsAsync()
    {
        var accounts = new List<AccountResponse>();

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        // 1. Get all accounts
        const string accountsSql = """
            SELECT
                id,
                account_name,
                client_name,
                client_email,
                client_phone,
                client_timezone,
                sales_rep_name,
                sales_rep_email,
                sales_rep_phone,
                created_at,
                updated_at,
                status,
                closed_at
            FROM accounts
            ORDER BY account_name;
            """;

        await using (var command = new NpgsqlCommand(accountsSql, connection))
        await using (var reader = await command.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                accounts.Add(new AccountResponse
                {
                    Id = reader.GetGuid(0),
                    AccountName = reader.GetString(1),
                    ClientName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    ClientEmail = reader.IsDBNull(3) ? null : reader.GetString(3),
                    ClientPhone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    ClientTimezone = reader.IsDBNull(5) ? null : reader.GetString(5),
                    SalesRepName = reader.IsDBNull(6) ? null : reader.GetString(6),
                    SalesRepEmail = reader.IsDBNull(7) ? null : reader.GetString(7),
                    SalesRepPhone = reader.IsDBNull(8) ? null : reader.GetString(8),
                    CreatedAt = reader.GetDateTime(9),
                    UpdatedAt = reader.GetDateTime(10),
                    Status = reader.GetString(11),
                    ClosedAt = reader.IsDBNull(12)
                        ? null
                        : reader.GetDateTime(12)
                });
            }
        }

        // 2. Create a lookup for accounts by ID
        var accountsById = accounts.ToDictionary(account => account.Id);

        // 3. Get all cases
        const string casesSql = """
            SELECT
                id,
                account_id,
                case_number,
                status,
                order_deadline,
                art_deadline,
                mail_date,
                notes,
                created_at,
                updated_at,
                product_type
            FROM cases;
            """;

        await using (var command = new NpgsqlCommand(casesSql, connection))
        await using (var reader = await command.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var accountId = reader.GetGuid(1);

                // Skip cases whose account isn't in our result
                if (!accountsById.TryGetValue(accountId, out var account))
                {
                    continue;
                }

                account.Cases.Add(new CaseResponse
                {
                    Id = reader.GetGuid(0),
                    AccountId = accountId,
                    CaseNumber = reader.IsDBNull(2) ? null : reader.GetString(2),
                    Status = reader.IsDBNull(3) ? null : reader.GetString(3),
                    OrderDeadline = reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                    ArtDeadline = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    MailDate = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                    Notes = reader.IsDBNull(7) ? null : reader.GetString(7),
                    CreatedAt = reader.GetDateTime(8),
                    UpdatedAt = reader.GetDateTime(9),
                    ProductType = reader.IsDBNull(10) ? null : reader.GetString(10)
                });
            }
        }

        return accounts;
    }
}
