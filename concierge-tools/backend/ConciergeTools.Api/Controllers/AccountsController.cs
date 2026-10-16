
using Microsoft.AspNetCore.Mvc;
using ConciergeTools.Api.Services;

namespace ConciergeTools.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly AccountsService _accountsService;

    public AccountsController(AccountsService accountsService)
    {
        _accountsService = accountsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccounts()
    {
        var accounts = await _accountsService.GetAccountsAsync();
        return Ok(accounts);
    }
}
