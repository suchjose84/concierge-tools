
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace ConciergeTools.Api.Controllers;

[ApiController]
[Route("api/database-test")]
public class DatabaseTestController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public DatabaseTestController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    [HttpGet]
    public async Task<IActionResult> TestConnection()
    {
        try
        {
            await using var connection =
                await _dataSource.OpenConnectionAsync();

            await using var command =
                new NpgsqlCommand("SELECT 1", connection);

            var result = await command.ExecuteScalarAsync();

            return Ok(new
            {
                success = true,
                message = "Connected to Supabase PostgreSQL!",
                result
            });
        }
        catch (NpgsqlException ex)
        {
            Console.WriteLine($"Database error: {ex.Message}");

            return StatusCode(503, new
            {
                success = false,
                message = "Database connection failed. Check the server logs."
            });
        }
    }
}
