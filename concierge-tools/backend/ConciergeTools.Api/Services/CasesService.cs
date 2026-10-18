
using Npgsql;

namespace ConciergeTools.Api.Services;

public class CasesService
{
    private readonly NpgsqlDataSource _dataSource;

    public CasesService(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<object?> GetCaseByIdAsync(Guid caseId)
    {
        const string sql = """
            SELECT
                id,
                account_id,
                case_number,
                product_type,
                status,
                order_deadline,
                art_deadline,
                mail_date,
                notes
            FROM public.cases
            WHERE id = @caseId;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("caseId", caseId);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new
        {
            id = reader.GetGuid(0),
            account_id = reader.GetGuid(1),
            case_number = reader.GetString(2),
            product_type = reader.IsDBNull(3)
                ? null
                : reader.GetString(3),
            status = reader.GetString(4),
            order_deadline = reader.IsDBNull(5)
                ? null
                : reader.GetValue(5),
            art_deadline = reader.IsDBNull(6)
                ? null
                : reader.GetValue(6),
            mail_date = reader.IsDBNull(7)
                ? null
                : reader.GetValue(7),
            notes = reader.IsDBNull(8)
                ? null
                : reader.GetString(8)
        };
    }

    public async Task<List<object>> GetActivitiesByCaseIdAsync(
        Guid caseId)
    {
        const string sql = """
            SELECT
                id,
                case_id,
                activity_type,
                note,
                starting_status,
                ending_status,
                started_at,
                ended_at,
                duration_seconds
            FROM public.activities
            WHERE case_id = @caseId
            ORDER BY started_at DESC;
            """;

        var activities = new List<object>();

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("caseId", caseId);

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            activities.Add(new
            {
                id = reader.GetGuid(0),
                case_id = reader.GetGuid(1),
                activity_type = reader.GetString(2),
                note = reader.IsDBNull(3)
                    ? null
                    : reader.GetString(3),
                starting_status = reader.IsDBNull(4)
                    ? null
                    : reader.GetString(4),
                ending_status = reader.IsDBNull(5)
                    ? null
                    : reader.GetString(5),
                started_at = reader.GetFieldValue<DateTimeOffset>(6),
                ended_at = reader.IsDBNull(7)
                    ? (DateTimeOffset?)null
                    : reader.GetFieldValue<DateTimeOffset>(7),
                duration_seconds = reader.GetInt32(8)
            });
        }

        return activities;
    }

    public async Task<Guid> SaveActivityAsync(
        Guid caseId,
        string endingStatus,
        string note,
        DateTimeOffset startedAt,
        DateTimeOffset endedAt,
        int durationSeconds)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            throw new ArgumentException(
                "Please describe the work performed.");
        }

        if (string.IsNullOrWhiteSpace(endingStatus))
        {
            throw new ArgumentException(
                "Ending status is required.");
        }

        if (startedAt == default ||
            endedAt == default ||
            endedAt < startedAt ||
            durationSeconds < 0)
        {
            throw new ArgumentException(
                "Invalid activity timing.");
        }

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        string startingStatus;

        await using (var command = new NpgsqlCommand(
            """
            SELECT status
            FROM public.cases
            WHERE id = @caseId
            FOR UPDATE;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("caseId", caseId);

            var result = await command.ExecuteScalarAsync();

            if (result is null || result is DBNull)
            {
                throw new KeyNotFoundException("Case not found.");
            }

            startingStatus = (string)result;
        }

        Guid activityId;

        await using (var command = new NpgsqlCommand(
            """
            INSERT INTO public.activities (
                case_id,
                activity_type,
                note,
                starting_status,
                ending_status,
                started_at,
                ended_at,
                duration_seconds
            )
            VALUES (
                @caseId,
                'Work',
                @note,
                @startingStatus,
                @endingStatus,
                @startedAt,
                @endedAt,
                @durationSeconds
            )
            RETURNING id;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("caseId", caseId);
            command.Parameters.AddWithValue("note", note.Trim());
            command.Parameters.AddWithValue(
                "startingStatus", startingStatus);
            command.Parameters.AddWithValue(
                "endingStatus", endingStatus.Trim());
            command.Parameters.AddWithValue("startedAt", startedAt);
            command.Parameters.AddWithValue("endedAt", endedAt);
            command.Parameters.AddWithValue(
                "durationSeconds", durationSeconds);

            var result = await command.ExecuteScalarAsync();

            if (result is not Guid id)
            {
                throw new InvalidOperationException(
                    "Activity was not created.");
            }

            activityId = id;
        }

        await using (var command = new NpgsqlCommand(
            """
            UPDATE public.cases
            SET status = @endingStatus,
                updated_at = now()
            WHERE id = @caseId;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("caseId", caseId);
            command.Parameters.AddWithValue(
                "endingStatus", endingStatus.Trim());

            await command.ExecuteNonQueryAsync();
        }

        await transaction.CommitAsync();

        return activityId;
    }
}
