
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using ConciergeTools.Api.Services;

namespace ConciergeTools.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkdaysController : ControllerBase
{
    private readonly WorkdaysService _workdaysService;

    public WorkdaysController(WorkdaysService workdaysService)
    {
        _workdaysService = workdaysService;
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveWorkday()
    {
        var workday =
            await _workdaysService.GetActiveWorkdayAsync();

        return Ok(new { workday });
    }

    
    [HttpPost("start")]
    public async Task<IActionResult> StartWorkday(
        [FromBody] StartWorkdayRequest request)
    {
        try
        {
            var workday =
                await _workdaysService.StartWorkdayAsync(
                    request.ShiftDate);

            return Ok(workday);
        }
        catch (PostgresException ex)
            when (ex.SqlState == "23505")
        {
            return Conflict(new
            {
                message = "A workday is already active."
            });
        }
    }


    [HttpPost("end")]
    public async Task<IActionResult> EndWorkday()
    {
        var workday =
            await _workdaysService.EndWorkdayAsync();

        if (workday is null)
        {
            return NotFound(new
            {
                message = "No active workday found."
            });
        }

        return Ok(workday);
    }

    [HttpPost("huddle/start")]
    public async Task<IActionResult> StartHuddle()
    {
        try
        {
            var huddle =
                await _workdaysService.StartHuddleAsync();

            return Ok(huddle);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (PostgresException ex)
            when (ex.SqlState == "23505")
        {
            return Conflict(new
            {
                message = "A huddle is already active."
            });
        }
    }

    [HttpPost("huddle/end")]
    public async Task<IActionResult> EndHuddle()
    {
        var huddle =
            await _workdaysService.EndHuddleAsync();

        if (huddle is null)
        {
            return NotFound(new
            {
                message = "No active huddle found."
            });
        }

        return Ok(huddle);
    }
}


public record StartWorkdayRequest(DateOnly ShiftDate);

