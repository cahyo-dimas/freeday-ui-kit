namespace Freeday.Blazor;

/// <summary>One selectable option for <see cref="FdyCombo{TValue}"/>.</summary>
/// <typeparam name="TValue">The bound value type (string, an enum, an int, …).</typeparam>
/// <param name="Value">The value bound through <c>@bind-Value</c> when this option is picked.</param>
/// <param name="Label">The visible text.</param>
public sealed record FdyComboOption<TValue>(TValue Value, string Label);
