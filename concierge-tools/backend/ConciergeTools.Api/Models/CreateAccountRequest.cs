
using System.ComponentModel.DataAnnotations;

namespace ConciergeTools.Api.Models;

public class CreateAccountRequest
{
    [Required]
    public string AccountName { get; set; } = string.Empty;

    public string? ClientName { get; set; }
    public string? ClientEmail { get; set; }
    public string? ClientPhone { get; set; }
    public string? ClientTimezone { get; set; }

    public string? SalesRepName { get; set; }
    public string? SalesRepEmail { get; set; }
    public string? SalesRepPhone { get; set; }
}
