package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthReturnsOK(t *testing.T) {
	router := NewRouter()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected body: %s", recorder.Body.String())
	}
}
