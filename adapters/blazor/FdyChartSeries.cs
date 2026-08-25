using System.Text.Json.Serialization;

namespace Freeday.Blazor;

/// <summary>One data series in a multi-series chart (line/area/bar). Serialised to the renderer's
/// <c>data-series</c> JSON shape <c>{ label, values, role? }</c>, hence the camelCase names.</summary>
public sealed record FdyChartSeries(
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("values")] IReadOnlyList<double> Values,
    [property: JsonPropertyName("role")] string? Role = null);
