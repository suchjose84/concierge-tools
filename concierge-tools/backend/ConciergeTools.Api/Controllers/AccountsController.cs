
using Microsoft.AspNetCore.Mvc;
using ConciergeTools.Api.Services;
using ConciergeTools.Api.Models;

namespace ConciergeTools.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly AccountsService _accountsService;
    private readonly AccountCasesService _accountCasesService;

    public AccountsController(
        AccountsService accountsService,
        AccountCasesService accountCasesService)
    {
        _accountsService = accountsService;
        _accountCasesService = accountCasesService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccounts()
    {
        var accounts = await _accountsService.GetAccountsAsync();
        return Ok(accounts);
    }

    
    [HttpPost]
    public async Task<IActionResult> CreateAccount(
        [FromBody] CreateAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountName))
        {
            return BadRequest(new
            {
                message = "Account name is required."
            });
        }

        var account = await _accountsService.CreateAccountAsync(request);

        return CreatedAtAction(
            nameof(GetAccounts),
            new { id = account.Id },
            account);
    }

    [HttpPost("with-cases")]
    public async Task<IActionResult> CreateAccountWithCases(
        [FromBody] CreateAccountWithCasesRequest request)
    {
        try
        {
            var result =
                await _accountCasesService.CreateAccountWithCasesAsync(
                    request);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> UpdateAccount(
        Guid id,
        [FromBody] UpdateAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountName))
        {
            return BadRequest(new
            {
                message = "Account name is required."
            });
        }

        var updated = await _accountsService.UpdateAccountAsync(id, request);

        if (!updated)
        {
            return NotFound(new
            {
                message = "Account not found or no longer active."
            });
        }

        return Ok(new
        {
            message = "Account updated successfully."
        });
    }


    [HttpPatch("{id:guid}/close")]
    public async Task<IActionResult> CloseAccount(Guid id)
    {
        var closed = await _accountsService.CloseAccountAsync(id);

        if (!closed)
        {
            return NotFound(new
            {
                message = "Account not found or already closed."
            });
        }

        return Ok(new
        {
            message = "Account closed successfully."
        });
    }




}


