
using Npgsql;

namespace ConciergeTools.Api.Services;

public class WorkdaysService
{
    // Temporary identifier until authentication is implemented.
    private const string UserKey = "suchjose84";

    private readonly NpgsqlDataSource _dataSource;

    public WorkdaysService(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<object?> GetActiveWorkdayAsync()
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync();

        Guid workdayId;
        DateTimeOffset startedAt;

        await using (var command = new NpgsqlCommand(
            """
            SELECT id, started_at
            FROM public.workdays
            WHERE user_key = @userKey
              AND ended_at IS NULL;
            """,
            connection))
        {
            command.Parameters.AddWithValue("userKey", UserKey);

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return null;
            }

            workdayId = reader.GetGuid(0);
            startedAt = reader.GetFieldValue<DateTimeOffset>(1);
        }

        object? activeHuddle = null;

        await using (var command = new NpgsqlCommand(
            """
            SELECT id, started_at
            FROM public.huddle_sessions
            WHERE workday_id = @workdayId
              AND ended_at IS NULL;
            """,
            connection))
        {
            command.Parameters.AddWithValue("workdayId", workdayId);

            await using var reader =
                await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                activeHuddle = new
                {
                    id = reader.GetGuid(0),
                    startedAt =
                        reader.GetFieldValue<DateTimeOffset>(1)
                };
            }
        }

        return new
        {
            id = workdayId,
            userKey = UserKey,
            startedAt,
            endedAt = (DateTimeOffset?)null,
            activeHuddle
        };
    }

    
    public async Task<object> StartWorkdayAsync(DateOnly shiftDate)
    {
        const string sql = """
            INSERT INTO public.workdays (
                user_key,
                shift_date
            )
            VALUES (
                @userKey,
                @shiftDate
            )
            RETURNING id, started_at, shift_date;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("userKey", UserKey);
        command.Parameters.AddWithValue("shiftDate", shiftDate);

        await using var reader =
            await command.ExecuteReaderAsync();

        await reader.ReadAsync();

        return new
        {
            id = reader.GetGuid(0),
            userKey = UserKey,
            startedAt = reader.GetFieldValue<DateTimeOffset>(1),
            shiftDate = reader.GetFieldValue<DateOnly>(2),
            endedAt = (DateTimeOffset?)null
        };
    }


    public async Task<object?> EndWorkdayAsync()
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        Guid workdayId;

        await using (var command = new NpgsqlCommand(
            """
            SELECT id
            FROM public.workdays
            WHERE user_key = @userKey
              AND ended_at IS NULL
            FOR UPDATE;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("userKey", UserKey);

            var result = await command.ExecuteScalarAsync();

            if (result is not Guid id)
            {
                return null;
            }

            workdayId = id;
        }

        // Close any active huddle when the workday ends.
        await using (var command = new NpgsqlCommand(
            """
            UPDATE public.huddle_sessions
            SET ended_at = NOW()
            WHERE workday_id = @workdayId
              AND ended_at IS NULL;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("workdayId", workdayId);
            await command.ExecuteNonQueryAsync();
        }

        DateTimeOffset endedAt;

        await using (var command = new NpgsqlCommand(
            """
            UPDATE public.workdays
            SET ended_at = NOW()
            WHERE id = @workdayId
            RETURNING ended_at;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("workdayId", workdayId);

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                throw new InvalidOperationException(
                    "Workday could not be ended.");
            }

            endedAt = reader.GetFieldValue<DateTimeOffset>(0);
        }

        await transaction.CommitAsync();

        return new
        {
            id = workdayId,
            endedAt
        };
    }

    public async Task<object> StartHuddleAsync()
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync();

        Guid workdayId;

        await using (var command = new NpgsqlCommand(
            """
            SELECT id
            FROM public.workdays
            WHERE user_key = @userKey
              AND ended_at IS NULL;
            """,
            connection))
        {
            command.Parameters.AddWithValue("userKey", UserKey);

            var result = await command.ExecuteScalarAsync();

            if (result is not Guid id)
            {
                throw new InvalidOperationException(
                    "Start your workday before starting a huddle.");
            }

            workdayId = id;
        }

        await using var insertCommand = new NpgsqlCommand(
            """
            INSERT INTO public.huddle_sessions (
                workday_id,
                user_key
            )
            VALUES (@workdayId, @userKey)
            RETURNING id, started_at;
            """,
            connection);

        insertCommand.Parameters.AddWithValue("workdayId", workdayId);
        insertCommand.Parameters.AddWithValue("userKey", UserKey);

        await using var reader =
            await insertCommand.ExecuteReaderAsync();

        await reader.ReadAsync();

        return new
        {
            id = reader.GetGuid(0),
            workdayId,
            startedAt = reader.GetFieldValue<DateTimeOffset>(1),
            endedAt = (DateTimeOffset?)null
        };
    }

    public async Task<object?> EndHuddleAsync()
    {
        const string sql = """
            UPDATE public.huddle_sessions AS h
            SET ended_at = NOW()
            FROM public.workdays AS w
            WHERE h.workday_id = w.id
              AND h.user_key = @userKey
              AND w.user_key = @userKey
              AND w.ended_at IS NULL
              AND h.ended_at IS NULL
            RETURNING h.id, h.workday_id, h.ended_at;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("userKey", UserKey);

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new
        {
            id = reader.GetGuid(0),
            workdayId = reader.GetGuid(1),
            endedAt = reader.GetFieldValue<DateTimeOffset>(2)
        };
    }
}
