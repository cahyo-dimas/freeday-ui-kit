namespace Freeday.Blazor;

/// <summary>A node in an <see cref="FdyCascade"/> hierarchy. A node with children is a branch
/// (drills in); a node without is a leaf (selects, storing the full path as the value).</summary>
/// <param name="Value">The value stored when this leaf is chosen (branches pass it through their leaves).</param>
/// <param name="Label">The visible text.</param>
/// <param name="Children">Child nodes, or null for a leaf.</param>
public sealed record FdyCascadeNode(string Value, string Label, IReadOnlyList<FdyCascadeNode>? Children = null);
