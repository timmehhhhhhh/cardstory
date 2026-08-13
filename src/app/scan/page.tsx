"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { CaptureUpload } from "@/app/scan/_components/capture-upload";
import { ScanResultConfirm } from "@/app/scan/_components/scan-result-confirm";
import type { ScanCandidate } from "@/lib/scan/match";
import type { ScanIdentification } from "@/lib/scan/gemini";

interface IdentifyResponse {
  available: boolean;
  identification: ScanIdentification | null;
  candidates: ScanCandidate[];
}

type ScanState =
  | { step: "idle" }
  | { step: "analyzing"; previewUrl: string }
  | ({ step: "result"; previewUrl: string } & IdentifyResponse);

export default function ScanPage() {
  const [state, setState] = React.useState<ScanState>({ step: "idle" });

  async function handleCapture(result: { base64: string; mimeType: string; previewUrl: string }) {
    setState({ step: "analyzing", previewUrl: result.previewUrl });
    try {
      const res = await fetch("/api/scan/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: result.base64, mimeType: result.mimeType }),
      });
      const data: IdentifyResponse = res.ok
        ? await res.json()
        : { available: false, identification: null, candidates: [] };
      setState({ step: "result", previewUrl: result.previewUrl, ...data });
    } catch {
      setState({
        step: "result",
        previewUrl: result.previewUrl,
        available: false,
        identification: null,
        candidates: [],
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-lg font-semibold">Scan</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Point your camera at a card and we&apos;ll try to find it in the catalog.
      </p>

      {state.step === "idle" && <CaptureUpload onCapture={handleCapture} />}

      {state.step === "analyzing" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your photo…</p>
        </div>
      )}

      {state.step === "result" && (
        <ScanResultConfirm
          previewUrl={state.previewUrl}
          available={state.available}
          identification={state.identification}
          candidates={state.candidates}
          onRetry={() => setState({ step: "idle" })}
        />
      )}
    </div>
  );
}
