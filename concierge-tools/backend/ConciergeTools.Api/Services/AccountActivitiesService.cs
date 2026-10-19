
using Npgsql;

namespace ConciergeTools.Api.Services;

public class AccountActivitiesService
{
    private readonly NpgsqlDataSource _dataSource;

    // Temporary identifier until authentication is implemented.
    private const string UserKey = "suchjose84";

    public AccountActivitiesService(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<Guid> SaveSharedActivityAsync(
        Guid accountId,
        SaveSharedAccountActivityRequest request)
    {
        if (request.Cases == null || request.Cases.Count == 0)
            throw new ArgumentException("Select at least one case.");

        if (string.IsNullOrWhiteSpace(request.Note))
            throw new ArgumentException("Activity note is required.");

        if (request.EndedAt < request.StartedAt)
            throw new ArgumentException(
                "End time cannot be earlier than start time.");

        if (request.DurationSeconds < 0)
            throw new ArgumentException(
                "Duration cannot be negative.");

        if (request.Cases.Select(c => c.CaseId).Distinct().Count()
            != request.Cases.Count)
        {
            throw new ArgumentException(
                "Duplicate cases are not allowed.");
        }

        foreach (var selectedCase in request.Cases)
        {
            if (string.IsNullOrWhiteSpace(selectedCase.EndingStatus))
            {
                throw new ArgumentException(
                    "Ending status is required for every case.");
            }
        }

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            // Find the current active workday.
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
                    throw new InvalidOperationException(
                        "Start your workday before saving an account activity.");
                }

                workdayId = id;
            }

            // Create one shared activity linked to the active workday.
            Guid activityId;

            await using (var command = new NpgsqlCommand(
                """
                INSERT INTO public.account_activities
                    (account_id, workday_id, activity_type, note,
                     started_at, ended_at, duration_seconds)
                VALUES
                    (@accountId, @workdayId, 'Work', @note,
                     @startedAt, @endedAt, @durationSeconds)
                RETURNING id;
                """,
                connection,
                transaction))
            {
                command.Parameters.AddWithValue("accountId", accountId);
                command.Parameters.AddWithValue("workdayId", workdayId);
                command.Parameters.AddWithValue("note", request.Note.Trim());
                command.Parameters.AddWithValue("startedAt", request.StartedAt);
                command.Parameters.AddWithValue("endedAt", request.EndedAt);
                command.Parameters.AddWithValue(
                    "durationSeconds", request.DurationSeconds);

                activityId =
                    (Guid)(await command.ExecuteScalarAsync()
                    ?? throw new InvalidOperationException(
                        "Failed to create shared activity."));
            }

            foreach (var selectedCase in request.Cases)
            {
                string startingStatus;

                // Lock the case and verify it belongs to this account.
                await using (var command = new NpgsqlCommand(
                    """
                    SELECT status
                    FROM public.cases
                    WHERE id = @caseId
                      AND account_id = @accountId
                    FOR UPDATE;
                    """,
                    connection,
                    transaction))
                {
                    command.Parameters.AddWithValue(
                        "caseId", selectedCase.CaseId);
                    command.Parameters.AddWithValue(
                        "accountId", accountId);

                    var result = await command.ExecuteScalarAsync();

                    if (result is not string status)
                    {
                        throw new ArgumentException(
                            $"Case {selectedCase.CaseId} was not found " +
                            "under this account.");
                    }

                    startingStatus = status;
                }

                // Link the case to the shared activity.
                await using (var command = new NpgsqlCommand(
                    """
                    INSERT INTO public.account_activity_cases
                        (account_activity_id, case_id,
                         starting_status, ending_status)
                    VALUES
                        (@activityId, @caseId,
                         @startingStatus, @endingStatus);
                    """,
                    connection,
                    transaction))
                {
                    command.Parameters.AddWithValue(
                        "activityId", activityId);
                    command.Parameters.AddWithValue(
                        "caseId", selectedCase.CaseId);
                    command.Parameters.AddWithValue(
                        "startingStatus", startingStatus);
                    command.Parameters.AddWithValue(
                        "endingStatus", selectedCase.EndingStatus);

                    await command.ExecuteNonQueryAsync();
                }

                // Update this case's current status.
                await using (var command = new NpgsqlCommand(
                    """
                    UPDATE public.cases
                    SET status = @endingStatus,
                        updated_at = NOW()
                    WHERE id = @caseId
                      AND account_id = @accountId;
                    """,
                    connection,
                    transaction))
                {
                    command.Parameters.AddWithValue(
                        "endingStatus", selectedCase.EndingStatus);
                    command.Parameters.AddWithValue(
                        "caseId", selectedCase.CaseId);
                    command.Parameters.AddWithValue(
                        "accountId", accountId);

                    await command.ExecuteNonQueryAsync();
                }
            }

            await transaction.CommitAsync();

            return activityId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<ActivityReportRow>> GetActivityReportAsync(
        DateOnly? fromDate,
        DateOnly? toDate)
    {
        if (fromDate.HasValue && toDate.HasValue &&
            fromDate.Value > toDate.Value)
        {
            throw new ArgumentException(
                "Start date cannot be later than end date.");
        }

        var results = new List<ActivityReportRow>();

        await using var connection =
            await _dataSource.OpenConnectionAsync();

        // Return account activities only.
        // Workday Start, Workday End, and Huddle are excluded.
        // Date filtering is based on the selected workday's shift_date.
        await using var command = new NpgsqlCommand(
            """
            SELECT
                aa.id,
                a.account_name,
                aa.activity_type,
                aa.contact_type,
                aa.started_at,
                aa.ended_at,
                aa.duration_seconds,
                aa.note,
                COALESCE(
                    string_agg(
                        c.case_number,
                        ', ' ORDER BY c.case_number
                    ) FILTER (WHERE c.id IS NOT NULL),
                    ''
                ) AS case_numbers,
                COALESCE(
                    string_agg(
                        c.case_number || ' — ' ||
                        COALESCE(aac.ending_status, 'Unknown'),
                        '; ' ORDER BY c.case_number
                    ) FILTER (WHERE c.id IS NOT NULL),
                    ''
                ) AS case_statuses
            FROM public.account_activities aa
            JOIN public.accounts a
                ON a.id = aa.account_id
            JOIN public.workdays w
                ON w.id = aa.workday_id
            LEFT JOIN public.account_activity_cases aac
                ON aac.account_activity_id = aa.id
            LEFT JOIN public.cases c
                ON c.id = aac.case_id
            WHERE
                w.user_key = @userKey
                AND (@fromDate IS NULL OR w.shift_date >= @fromDate)
                AND (@toDate IS NULL OR w.shift_date <= @toDate)
            GROUP BY
                aa.id,
                a.account_name,
                aa.activity_type,
                aa.contact_type,
                aa.started_at,
                aa.ended_at,
                aa.duration_seconds,
                aa.note
            ORDER BY aa.started_at ASC;
            """,
            connection);

        command.Parameters.AddWithValue("userKey", UserKey);

        command.Parameters.Add(
            new NpgsqlParameter(
                "fromDate",
                NpgsqlTypes.NpgsqlDbType.Date)
            {
                Value = fromDate.HasValue
                    ? fromDate.Value.ToDateTime(TimeOnly.MinValue)
                    : DBNull.Value
            });

        command.Parameters.Add(
            new NpgsqlParameter(
                "toDate",
                NpgsqlTypes.NpgsqlDbType.Date)
            {
                Value = toDate.HasValue
                    ? toDate.Value.ToDateTime(TimeOnly.MinValue)
                    : DBNull.Value
            });

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            results.Add(new ActivityReportRow(
                Id: reader.GetGuid(0),
                AccountName: reader.GetString(1),
                ActivityType: reader.GetString(2),
                ContactType: reader.IsDBNull(3)
                    ? null
                    : reader.GetString(3),
                StartedAt: reader.GetFieldValue<DateTimeOffset>(4),
                EndedAt: reader.IsDBNull(5)
                    ? null
                    : reader.GetFieldValue<DateTimeOffset>(5),
                DurationSeconds: reader.GetInt32(6),
                Note: reader.IsDBNull(7)
                    ? null
                    : reader.GetString(7),
                CaseNumbers: reader.GetString(8),
                CaseStatuses: reader.GetString(9)
            ));
        }

        return results;
    }
}

public record SaveSharedAccountActivityRequest(
    string Note,
    DateTimeOffset StartedAt,
    DateTimeOffset EndedAt,
    int DurationSeconds,
    List<SharedActivityCaseRequest> Cases
);

public record SharedActivityCaseRequest(
    Guid CaseId,
    string EndingStatus
);

public record ActivityReportRow(
    Guid Id,
    string AccountName,
    string ActivityType,
    string? ContactType,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    int DurationSeconds,
    string? Note,
    string CaseNumbers,
    string CaseStatuses
)
{
    public string EventType { get; init; } = "Work";
}
