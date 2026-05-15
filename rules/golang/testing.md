---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Testing

> This file extends [common/testing.md](../common/testing.md) with Go specific content.

## Framework

Use the standard `go test` with **table-driven tests**.

## Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    cases := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 1, 2, 3},
        {"zero", 0, 0, 0},
        {"negative", -1, -2, -3},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got := Add(tc.a, tc.b)
            if got != tc.want {
                t.Errorf("Add(%d, %d) = %d, want %d", tc.a, tc.b, got, tc.want)
            }
        })
    }
}
```

## Subtests and Parallel

```go
t.Run("group", func(t *testing.T) {
    t.Parallel()
    // each subtest runs in parallel
})
```

## HTTP Testing

Use `net/http/httptest` — no real server needed:

```go
func TestHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/items", nil)
    w := httptest.NewRecorder()

    MyHandler(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusOK {
        t.Fatalf("got %d, want %d", resp.StatusCode, http.StatusOK)
    }
}
```

## Assertions (optional)

`github.com/stretchr/testify` is the de facto standard for richer assertions. Use when the project already depends on it; do not add it solely for one test.

```go
assert.Equal(t, want, got)
require.NoError(t, err) // stops test immediately on failure
```

## Race Detection

Always run with the `-race` flag:

```bash
go test -race ./...
```

## Coverage

```bash
go test -cover ./...
```

80% 임계값을 CI에서 강제하려면:

```bash
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | awk '/total:/ {pct=substr($3,1,length($3)-1); if (pct+0 < 80) {print "FAIL: coverage " pct "%"; exit 1}}'
```

## Reference

See skill: `golang-testing` for detailed Go testing patterns and helpers.
