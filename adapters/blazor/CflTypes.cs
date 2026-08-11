namespace Freeday.Blazor;

/// <summary>A column in the <see cref="FdyCfl{TRow}"/> results table.</summary>
/// <param name="Header">The column heading.</param>
/// <param name="Cell">Projects a row to the cell's display text.</param>
public sealed record CflColumn<TRow>(string Header, Func<TRow, string> Cell);

/// <summary>One page of results returned by <see cref="FdyCfl{TRow}"/>'s data source.</summary>
/// <param name="Rows">The rows in this page.</param>
/// <param name="HasMore">True if another page can be requested (drives "load more").</param>
public sealed record CflPage<TRow>(IReadOnlyList<TRow> Rows, bool HasMore);
