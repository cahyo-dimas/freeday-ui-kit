using Freeday.Blazor;
using Microsoft.AspNetCore.Components;

namespace FreedayBlazorFaktur.Pages;

public partial class ComponentsDemo : ComponentBase
{
    private string _status = "draft";
    private string? _tanggal;
    private bool _modalOpen;

    private static readonly IReadOnlyList<FdyComboOption<string>> _statusOptions = new[]
    {
        new FdyComboOption<string>("draft", "Draft"),
        new FdyComboOption<string>("tertunda", "Tertunda"),
        new FdyComboOption<string>("lunas", "Lunas"),
    };

    private void OpenModal() => _modalOpen = true;
    private void CloseModal() => _modalOpen = false;
}
