
using Microsoft.AspNetCore.Mvc;
using ConciergeTools.Api.Services;
using ConciergeTools.Api.Models;

namespace ConciergeTools.Api.Controllers;

public record SaveCaseActivityRequest(
    string EndingStatus,
    string Note,
    DateTimeOffset StartedAt,
    DateTimeOffset EndedAt,
    int DurationSeconds
);

[ApiController]
[Route("api/[controller]")]
public class CasesController : ControllerBase
{
    private readonly CasesService _casesService;

    public CasesController(CasesService casesService)
    {
        _casesService = casesService;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCaseById(Guid id)
    {
        var caseItem = await _casesService.GetCaseByIdAsync(id);

        if (caseItem is null)
        {
            return NotFound(new { message = "Case not found." });
        }

        return Ok(caseItem);
    }

    [HttpGet("{id:guid}/activities")]
    public async Task<IActionResult> GetActivities(Guid id)
    {
        var activities =
            await _casesService.GetActivitiesByCaseIdAsync(id);

        return Ok(activities);
    }

    [HttpPost("{id:guid}/activities")]
    public async Task<IActionResult> SaveActivity(
        Guid id,
        [FromBody] SaveCaseActivityRequest request)
    {
        try
        {
            var activityId = await _casesService.SaveActivityAsync(
                id,
                request.EndingStatus,
                request.Note,
                request.StartedAt,
                request.EndedAt,
                request.DurationSeconds
            );

            return Ok(new { activityId });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Case not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> UpdateCase(
        Guid id,
        [FromBody] UpdateCaseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CaseNumber))
        {
            return BadRequest(new
            {
                message = "Case number is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new
            {
                message = "Case status is required."
            });
        }

        try
        {
            var updated = await _casesService.UpdateCaseAsync(id, request);

            if (!updated)
            {
                return NotFound(new { message = "Case not found." });
            }

            return Ok(new { message = "Case updated successfully." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
