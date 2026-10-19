namespace ConciergeTools.Api.Models;

public class UpdateCaseRequest
{
    public string CaseNumber { get; set; } = string.Empty;
    public string? ProductType { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTimeOffset? OrderDeadline { get; set; }
    public DateTimeOffset? ArtDeadline { get; set; }
    public DateTimeOffset? MailDate { get; set; }
    public string? Notes { get; set; }
}