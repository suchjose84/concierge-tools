namespace ConciergeTools.Api.Models;

public class AccountResponse
{
    public Guid Id { get; set; }
    public string AccountName { get; set; } = string.Empty;

    public string? ClientName { get; set; }
    public string? ClientEmail { get; set; }
    public string? ClientPhone { get; set; }
    public string? ClientTimezone { get; set; }

    public string? SalesRepName { get; set; }
    public string? SalesRepEmail { get; set; }
    public string? SalesRepPhone { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? ClosedAt { get; set; }

    public List<CaseResponse> Cases { get; set; } = new();
}
