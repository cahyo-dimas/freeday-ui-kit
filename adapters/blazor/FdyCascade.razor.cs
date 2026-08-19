using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyCascade
{
    /// <summary>The hierarchy to drill through.</summary>
    [Parameter, EditorRequired] public IReadOnlyList<FdyCascadeNode> Nodes { get; set; } = Array.Empty<FdyCascadeNode>();

    /// <summary>The chosen leaf value. Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>Trigger label. English by default, matching Vue and React.</summary>
    [Parameter] public string Label { get; set; } = "Select";
    /// <summary>Empty-value placeholder. English by default, matching Vue and React.</summary>
    [Parameter] public string Placeholder { get; set; } = "Select…";

    /// <summary>Separator between labels in the displayed path (default " / ").</summary>
    [Parameter] public string Separator { get; set; } = " / ";

    /// <summary>aria-label for the button that goes up one level. Matches Vue and React.</summary>
    [Parameter] public string BackLabel { get; set; } = "Back one level";

    /// <summary>aria-label for a branch row. <c>{label}</c> is replaced with the node label.</summary>
    [Parameter] public string SubmenuLabel { get; set; } = "{label}, submenu";

    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayCascade.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-cascade-change", nameof(OnChange));

    protected override bool ShouldRender() => !Hydrated;

    /// <summary>Invoked by the bridge when the user selects a leaf.</summary>
    [JSInvokable]
    public async Task OnChange(ChangeDetail detail)
    {
        Value = detail.Value;
        await ValueChanged.InvokeAsync(detail.Value);
    }

    /// <summary>The detail shape of the enhancer's <c>fdy-cascade-change</c> event.</summary>
    public sealed record ChangeDetail(string? Value, string? Path, string[]? Labels);
}
