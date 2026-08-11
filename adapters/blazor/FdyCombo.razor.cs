using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyCombo<TValue>
{
    /// <summary>The selected value. Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter, EditorRequired] public TValue Value { get; set; } = default!;
    [Parameter] public EventCallback<TValue> ValueChanged { get; set; }

    /// <summary>The options to choose from.</summary>
    [Parameter, EditorRequired] public IReadOnlyList<FdyComboOption<TValue>> Options { get; set; }
        = Array.Empty<FdyComboOption<TValue>>();

    /// <summary>Shown when no option matches the current value.</summary>
    [Parameter] public string? Placeholder { get; set; }

    /// <summary>Id of the element labelling the combobox (for accessibility).</summary>
    [Parameter] public string? AriaLabelledby { get; set; }

    /// <summary>Explicit id for the combobox button (else an auto id is used).</summary>
    [Parameter] public string? Id { get; set; }

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: stays focusable and shows its value but can't be opened or changed.</summary>
    [Parameter] public bool Readonly { get; set; }

    [Parameter] public bool Invalid { get; set; }

    private readonly string _autoId = $"fdy-combo-{Guid.NewGuid():N}";
    private TValue _lastValue = default!;
    private bool _ready;

    // The enhancer owns this combo's DOM after hydration (open/close, aria-selected, the button
    // label). Re-rendering here would fight it — e.g. reconciling the listbox mid-close leaves it
    // stuck open. Render once for the initial markup, then never again; push external Value changes
    // through the enhancer via comboSetValue instead.
    protected override bool ShouldRender() => !Hydrated;

    private string ButtonId => Id ?? _autoId;
    private string RootClass => Invalid ? "fdy-combo fdy-combo--error" : "fdy-combo";
    private FdyComboOption<TValue>? SelectedOption
        => Options.FirstOrDefault(o => EqualityComparer<TValue>.Default.Equals(o.Value, Value));
    private string SelectedLabel => SelectedOption?.Label ?? Placeholder ?? string.Empty;
    private string SelectedKey => KeyOf(Value);

    private static string KeyOf(TValue value) => value?.ToString() ?? string.Empty;

    // The enhancer owns this combo's DOM; init it directly (initAll would skip Root itself).
    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayCombo.init", Root);

    protected override async ValueTask OnHydratedAsync()
    {
        _lastValue = Value;
        await SubscribeAsync("fdy-change", nameof(OnFdyChange));
        _ready = true;
    }

    protected override async Task OnParametersSetAsync()
    {
        // Push an externally-changed Value onto the enhancer-owned DOM (silent — no fdy-change echo).
        if (_ready && !EqualityComparer<TValue>.Default.Equals(Value, _lastValue))
        {
            _lastValue = Value;
            await JS.InvokeVoidAsync("FreedayBlazor.comboSetValue", Root, KeyOf(Value));
        }
    }

    /// <summary>Invoked by the bridge when the user picks an option (enhancer's fdy-change).</summary>
    [JSInvokable]
    public async Task OnFdyChange(ChangeDetail detail)
    {
        FdyComboOption<TValue>? match = Options.FirstOrDefault(o => KeyOf(o.Value) == detail.Value);
        if (match is not null)
        {
            _lastValue = match.Value;
            Value = match.Value;
            await ValueChanged.InvokeAsync(match.Value);
        }
    }

    /// <summary>The detail shape of the enhancer's <c>fdy-change</c> event.</summary>
    public sealed record ChangeDetail(string Value);
}
