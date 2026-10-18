
using System.ComponentModel.DataAnnotations;

namespace ConciergeTools.Api.Models;

public class CreateAccountWithCasesRequest
{
    public Guid? AccountId { get; set; }

    public CreateAccountRequest? Account { get; set; }

    [Required]
    [MinLength(1)]
    public List<CreateCaseRequest> Cases { get; set; } = [];
}
