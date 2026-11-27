namespace Freeday.Blazor;

/// <summary>
/// <c>event.detail</c> of <c>fdy-sort-change</c>, as <c>FreedayBlazor.sortOn</c> hands it to a
/// <c>[JSInvokable]</c> method. <see cref="Order"/> is the destination list's keys after the move;
/// <see cref="FromOrder"/> the source's (equal to <see cref="Order"/> within one list).
/// <see cref="FromList"/> and <see cref="ToList"/> are the lists' <c>data-key</c>, null on a list
/// without one.
/// </summary>
public sealed record FdySortChangeDetail(
    string Key,
    int From,
    int To,
    IReadOnlyList<string> Order,
    string? FromList,
    string? ToList,
    IReadOnlyList<string> FromOrder);
