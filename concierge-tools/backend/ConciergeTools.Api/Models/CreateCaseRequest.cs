
using System.ComponentModel.DataAnnotations;

namespace ConciergeTools.Api.Models;

public class CreateCaseRequest
{
    [Required]
    public string CaseNumber { get; set; } = string.Empty;

    public string? ProductType { get; set; }

    public DateTimeOffset? OrderDeadline { get; set; }

    public DateTimeOffset? ArtDeadline { get; set; }

    public DateTimeOffset? MailDate { get; set; }

    public string? Notes { get; set; }
}
