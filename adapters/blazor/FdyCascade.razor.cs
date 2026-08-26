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

    /// <summary>Id for the trigger the enhancer builds, so a form's label can point at it.</summary>
    [Parameter] public string? Id { get; set; }

    /// <summary>Id of the help or error text the trigger describes itself with.</summary>
    [Parameter] public string? Describedby { get; set; }

    /// <summary>Greyed and out of the tab order.</summary>
    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: focusable and showing its value, but it will not open.</summary>
    [Parameter] public bool Readonly { get; set; }

    /// <summary>Marks the field invalid (<c>aria-invalid</c> + the error styling).</summary>
    [Parameter] public bool Invalid { get; set; }

    protected override bool ShouldRender() => !Hydrated;

    /* Pushed, not re-rendered: the seed's <ul> is consumed and removed by the enhancer, so this
       component can never render again. */
    protected override async Task OnParametersSetAsync()
    {
        if (!Hydrated) return;
        await JS.InvokeVoidAsync("FreedayCascade.setState", Root,
            new { disabled = Disabled, @readonly = Readonly, invalid = Invalid });
    }

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
