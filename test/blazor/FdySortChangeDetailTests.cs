using System.Text.Json;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// The JSON FreedayBlazor.sortOn sends is the enhancer's detail, camelCase. Blazor deserialises
/// [JSInvokable] arguments with the web defaults, so the record must bind under those.
/// </summary>
public class FdySortChangeDetailTests
{
    [Fact]
    public void Binds_the_detail_sortOn_forwards()
    {
        const string json = """
            {"key":"a","from":0,"to":2,"order":["top","d","a"],"fromList":"todo","toList":"doing","fromOrder":["b","c"]}
            """;
        var detail = JsonSerializer.Deserialize<FdySortChangeDetail>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal("a", detail.Key);
        Assert.Equal(2, detail.To);
        Assert.Equal(new[] { "top", "d", "a" }, detail.Order);
        Assert.Equal("todo", detail.FromList);
        Assert.Equal(new[] { "b", "c" }, detail.FromOrder);
    }

    [Fact]
    public void An_ungrouped_list_names_no_lists()
    {
        const string json = """{"key":"a","from":0,"to":1,"order":["b","a"],"fromList":null,"toList":null,"fromOrder":["b","a"]}""";
        var detail = JsonSerializer.Deserialize<FdySortChangeDetail>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Null(detail.FromList);
        Assert.Null(detail.ToList);
    }
}
