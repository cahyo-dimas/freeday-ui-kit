using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyAutocomplete
{
    /// <summary>The selected text. Two-way bindable via <c>@bind-Value</c>.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>The suggestions to filter and choose from (their text is the value).</summary>
    [Parameter, EditorRequired] public IReadOnlyList<string> Options { get; set; } = Array.Empty<string>();

    [Parameter] public string? Placeholder { get; set; }
    [Parameter] public string? AriaLabel { get; set; }

    /// <summary>Text shown when no option matches the typed query.</summary>
    [Parameter] public string EmptyText { get; set; } = "No results";

    private readonly string _listId = $"fdy-ac-{Guid.NewGuid():N}";

    protected override ValueTask HydrateAsync() => JS.InvokeVoidAsync("FreedayAutocomplete.init", Root);

    protected override async ValueTask OnHydratedAsync()
        => await SubscribeAsync("fdy-autocomplete-select", nameof(OnSelect));

    /// <summary>Explicit id for the input.</summary>
    [Parameter] public string? Id { get; set; }

    /// <summary>Id of the element that labels the input, when a visible label does the naming.</summary>
    [Parameter] public string? AriaLabelledby { get; set; }

    /// <summary>Id of the help or error text the input describes itself with.</summary>
    [Parameter] public string? Describedby { get; set; }

    /// <summary>Greyed and out of the tab order.</summary>
    [Parameter] public bool Disabled { get; set; }

    /// <summary>Locked/view mode: focusable and showing its value, not editable, and the
    /// suggestion list will not open.</summary>
    [Parameter] public bool Readonly { get; set; }

    /// <summary>Marks the field invalid (<c>aria-invalid</c>).</summary>
    [Parameter] public bool Invalid { get; set; }

    /// <summary>The native <c>required</c>, on the input itself: it is editable, so constraint
    /// validation (and so a <c>data-fdy-validate</c> form) applies to it as to any input. Pushed
    /// with the other states, so a field required only under a condition follows it (#114).</summary>
    [Parameter] public bool Required { get; set; }

    /// <summary>Any other attribute (<c>maxlength</c>, <c>inputmode</c>, <c>name</c>, a per-control
    /// <c>data-fdy-msg-required</c>) lands on the <c>&lt;input&gt;</c>; <c>class</c> and <c>style</c>
    /// stay on the root, which is what sizes the control. The attributes the component sets itself
    /// win, since they are written after these (#115).</summary>
    [Parameter(CaptureUnmatchedValues = true)]
    public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }

    private string RootClass => Unmatched("class") is { } extra ? $"fdy-autocomplete {extra}" : "fdy-autocomplete";
    private string? RootStyle => Unmatched("style");
    private IEnumerable<KeyValuePair<string, object>> InputAttributes =>
        (AdditionalAttributes ?? new Dictionary<string, object>()).Where(a => a.Key is not ("class" or "style"));

    private string? Unmatched(string name) =>
        AdditionalAttributes is not null && AdditionalAttributes.TryGetValue(name, out object? value) ? value?.ToString() : null;

    protected override bool ShouldRender() => !Hydrated;

    /* What the seed shows until hydration, then what was last pushed, typed or picked. The seed is
       rendered once, so Value and Options the host changed afterwards reached nothing (#123). */
    private string? _shownValue;
    private IReadOnlyList<string> _shownOptions = Array.Empty<string>();

    protected override async Task OnParametersSetAsync()
    {
        if (!Hydrated)
        {
            _shownValue = Value;
            _shownOptions = Options;
            return;
        }
        /* Compared by content: a host that rebuilds the same list on every render is not a change. */
        if (!_shownOptions.SequenceEqual(Options))
        {
            _shownOptions = Options;
            await JS.InvokeVoidAsync("FreedayAutocomplete.setOptions", Root, Options);
        }
        if (Value != _shownValue)
        {
            _shownValue = Value;
            await JS.InvokeVoidAsync("FreedayAutocomplete.setValue", Root, Value ?? string.Empty);
        }
        await JS.InvokeVoidAsync("FreedayAutocomplete.setState", Root,
            new { disabled = Disabled, @readonly = Readonly, invalid = Invalid, required = Required });
    }

    /// <summary>Invoked by the bridge when the user picks a suggestion.</summary>
    [JSInvokable]
    public async Task OnSelect(SelectDetail detail)
    {
        Value = detail.Value;
        _shownValue = detail.Value;
        await ValueChanged.InvokeAsync(detail.Value);
    }

    /// <summary>Free text, reported as it is typed, the same as the Vue and React components. Only a
    /// pick used to reach <c>ValueChanged</c>, so a typed value that matched no suggestion showed in
    /// the field while <c>Value</c> kept the old one.</summary>
    private async Task OnInputAsync(ChangeEventArgs e)
    {
        string? text = e.Value?.ToString();
        Value = text;
        _shownValue = text;
        await ValueChanged.InvokeAsync(text);
    }

    /// <summary>The (DOM-safe) detail of the enhancer's <c>fdy-autocomplete-select</c> event.</summary>
    public sealed record SelectDetail(string? Value);
}
