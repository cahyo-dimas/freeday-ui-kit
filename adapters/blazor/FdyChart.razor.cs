using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

// Not a FreedayComponentBase: a chart has no fdy-* events and no <dialog>, and must repaint on
// EVERY data change (not hydrate-once), so it drives its own render lifecycle directly.
public partial class FdyChart : ComponentBase
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    /// <summary>Chart kind: <c>line</c> | <c>area</c> | <c>bar</c> | <c>sparkline</c> | <c>donut</c>.</summary>
    [Parameter, EditorRequired] public string Type { get; set; } = default!;

    /// <summary>Multi-series data (line/area/bar). Takes precedence over <see cref="Values"/>.</summary>
    [Parameter] public IReadOnlyList<FdyChartSeries>? Series { get; set; }

    /// <summary>Single-series shortcut (sparkline/donut/simple bar).</summary>
    [Parameter] public IReadOnlyList<double>? Values { get; set; }

    /// <summary>Category axis labels.</summary>
    [Parameter] public IReadOnlyList<string>? Labels { get; set; }

    /// <summary>Value format: <c>number</c> | <c>percent</c> | <c>currency</c>.</summary>
    [Parameter] public string? Format { get; set; }

    /// <summary>Stack the series (bar/area). Switches a bar chart into cartesian layout.</summary>
    [Parameter] public bool Stacked { get; set; }

    /// <summary>Legend visibility: <c>auto</c> | <c>always</c> | <c>none</c>.</summary>
    [Parameter] public string? Legend { get; set; }

    /// <summary>Per-series colour override — semantic token names (primary/accent/success/…) or
    /// categorical slots <c>chart-1</c>..<c>chart-8</c>. Omit for the default chart palette.</summary>
    [Parameter] public IReadOnlyList<string>? Colors { get; set; }

    /// <summary>Single-colour override for a one-series chart.</summary>
    [Parameter] public string? Color { get; set; }

    /// <summary>Donut centre label.</summary>
    [Parameter] public string? Center { get; set; }

    [Parameter] public string? AriaLabel { get; set; }

    /// <summary>Fallback content shown until the renderer paints (e.g. before dist/freeday.js loads).</summary>
    [Parameter] public RenderFragment? ChildContent { get; set; }

    /// <summary>The chart root; Blazor owns its attributes, the renderer paints its SVG children.</summary>
    protected ElementReference Root;

    private static readonly JsonSerializerOptions SeriesJson = new() { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };

    // Cartesian (axes) for line/area, or a bar with multiple series / stacking; those get their
    // layout class from the renderer. sparkline/donut/simple-bar need their layout class up front.
    private bool IsCartesian =>
        Type == "line" || Type == "area" || (Type == "bar" && (Series is not null || Stacked));

    private string RootClass => Type switch
    {
        "sparkline" => "fdy-sparkline",
        "donut" => "fdy-donut",
        "bar" when !IsCartesian => "fdy-bars",
        _ => string.Empty,
    };

    // null → Blazor omits the attribute entirely (the renderer then falls back correctly).
    private string? SeriesAttr => Series is null ? null : JsonSerializer.Serialize(Series, SeriesJson);
    private string? ValuesAttr => Values is null ? null : string.Join(",", Values.Select(v => v.ToString(CultureInfo.InvariantCulture)));
    private string? LabelsAttr => Labels is null ? null : string.Join(",", Labels);
    private string? ColorsAttr => Colors is null ? null : string.Join(",", Colors);
    private string? StackedAttr => Stacked ? string.Empty : null; // presence attribute

    // Signature of every data-affecting attribute — the C# analogue of the Vue/React watch list.
    private string DataSignature => string.Join("", Type, SeriesAttr, ValuesAttr, LabelsAttr,
        Format, StackedAttr, Legend, ColorsAttr, Color, Center);

    private string? _lastSignature;

    // Repaint only when the chart's own data changed (first render, or a data-* attribute differs
    // since the last paint) — so an unrelated parent re-render doesn't needlessly repaint the SVG.
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        string sig = DataSignature;
        if (!firstRender && sig == _lastSignature) return;
        _lastSignature = sig;
        await JS.InvokeVoidAsync("FreedayBlazor.chartUpdate", Root);
    }
}
