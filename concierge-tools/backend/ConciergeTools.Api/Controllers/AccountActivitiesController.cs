
using ConciergeTools.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ConciergeTools.Api.Controllers;

[ApiController]
[Route("api/accounts/{accountId:guid}/activities")]
public class AccountActivitiesController : ControllerBase
{
    private readonly AccountActivitiesService _service;

    public AccountActivitiesController(
        AccountActivitiesService service)
    {
        _service = service;
    }

    [HttpPost("shared")]
    public async Task<IActionResult> SaveSharedActivity(
        Guid accountId,
        [FromBody] SaveSharedAccountActivityRequest request)
    {
        try
        {
            var activityId =
                await _service.SaveSharedActivityAsync(
                    accountId, request);

            return Ok(new
            {
                success = true,
                activityId
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpGet("/api/activity-report")]
    public async Task<IActionResult> GetActivityReport(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate)
    {
        try
        {
            var activities = await _service.GetActivityReportAsync(
                fromDate,
                toDate
            );

            return Ok(activities);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }
}
