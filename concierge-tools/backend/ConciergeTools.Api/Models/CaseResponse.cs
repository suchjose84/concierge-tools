
namespace ConciergeTools.Api.Models;

public class CaseResponse
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }

    public string? CaseNumber { get; set; }
    public string? Status { get; set; }
    public DateTime? OrderDeadline { get; set; }
    public DateTime? ArtDeadline { get; set; }
    public DateTime? MailDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ProductType { get; set; }
}
