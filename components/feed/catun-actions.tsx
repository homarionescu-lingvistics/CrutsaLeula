"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateListingForm } from "@/components/piata/create-listing-form";
import { TikTokCameraModal } from "@/components/share/tiktok-camera-modal";
import { Button } from "@/components/ui/button";

type Props = {
  loggedIn: boolean;
};

export function CatunActions({ loggedIn }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <div className="space-y-2">
      {loggedIn ? (
        <CreateListingForm triggerLabel="+ Publică aici" />
      ) : (
        <Link href="/auth/login?next=/">
          <Button className="w-full">+ Publică aici</Button>
        </Link>
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full border border-zinc-300 bg-white text-zinc-900"
        onClick={() => setCameraOpen(true)}
      >
        TikTok 15s — cameră
      </Button>

      <TikTokCameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} />
    </div>
  );
}
