"use client";

import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_NAME_LENGTH = 16;
const MAX_AVATAR_BYTES = 1024 * 1024;

type ProfileEditorStep = "name" | "picture" | "upload" | "preview" | "saving" | "success" | "error" | "closing";

export function ProfileEditor({
  displayName,
  username,
  avatarUrl
}: {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ProfileEditorStep>("name");
  const [name, setName] = useState(displayName.slice(0, MAX_NAME_LENGTH));
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const currentAvatar = preview ?? avatarUrl;

  function openEditor() {
    setName(displayName.slice(0, MAX_NAME_LENGTH));
    setPreview(null);
    setError("");
    setStep("name");
    setOpen(true);
  }

  function closeEditor() {
    if (step === "saving") {
      return;
    }

    setStep("closing");
    window.setTimeout(() => {
      setOpen(false);
      setStep("name");
    }, 240);
  }

  async function selectFile(file?: File) {
    setError("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError("Maximum size allowed: 1 MB");
      return;
    }

    try {
      const compressed = await compressAvatar(file);
      setPreview(compressed);
      setStep("preview");
    } catch {
      setError("Could not read that image.");
    }
  }

  async function saveProfile() {
    const displayNameValue = name.trim();

    if (!displayNameValue || displayNameValue.length > MAX_NAME_LENGTH) {
      setError("Name should be 1-16 characters.");
      setStep("name");
      return;
    }

    setError("");
    setStep("saving");
    const response = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayNameValue,
        avatarUrl: preview
      })
    });

    if (response.ok) {
      router.refresh();
      window.setTimeout(() => setStep("success"), 650);
      window.setTimeout(() => setStep("closing"), 1450);
      window.setTimeout(() => {
        setOpen(false);
        setStep("name");
      }, 1750);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error ?? "Your profile couldn't be updated. Please try later");
    setStep("error");
  }

  return (
    <>
      <h1>
        <button className="profile-name-edit" onClick={openEditor} type="button">
          {displayName}
        </button>
      </h1>

      {open ? (
        <div
          className={`modal-backdrop profile-edit-backdrop${step === "closing" ? " closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditor();
            }
          }}
        >
          <div className={`profile-edit-dialog profile-edit-dialog-${step}`}>
            {step === "name" ? (
              <>
                <h2>Edit profile</h2>
                <label className="profile-name-field">
                  <input
                    value={name}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(event) => {
                      setName(event.target.value.slice(0, MAX_NAME_LENGTH));
                      setError("");
                    }}
                    placeholder="Enter new name"
                  />
                  <span>@{username}</span>
                </label>
                <button className="profile-edit-pill" disabled={!name.trim()} onClick={() => setStep("picture")} type="button">
                  Next
                </button>
                {error ? <p className="profile-edit-error">{error}</p> : null}
              </>
            ) : null}

            {step === "picture" ? (
              <>
                <h2>Edit profile picture</h2>
                <div className="profile-picture-row">
                  <button className="profile-picture-button" onClick={() => setStep("upload")} type="button" aria-label="Choose profile picture">
                    {currentAvatar ? <img src={currentAvatar} alt="" /> : <span />}
                  </button>
                  <div>
                    <strong>{name.trim() || displayName}</strong>
                    <span>@{username}</span>
                  </div>
                </div>
                <button className="profile-edit-pill" onClick={saveProfile} type="button">
                  Skip
                </button>
              </>
            ) : null}

            {step === "upload" ? (
              <>
                <h2>Edit profile picture</h2>
                <button className="profile-upload-button" onClick={() => fileInputRef.current?.click()} type="button">
                  <Upload size={20} />
                  Upload
                </button>
                <p className="profile-upload-help">Maximum size allowed: 1MB</p>
                <button className="profile-edit-pill" onClick={saveProfile} type="button">
                  Skip
                </button>
                {error ? <p className="profile-edit-error">{error}</p> : null}
              </>
            ) : null}

            {step === "preview" ? (
              <>
                <h2>Preview profile picture</h2>
                {preview ? <img className="profile-picture-preview" src={preview} alt="" /> : null}
                <button className="profile-edit-pill" onClick={saveProfile} type="button">
                  Finish
                </button>
              </>
            ) : null}

            {step === "saving" ? (
              <div className="log-feedback">
                <h2>Your profile is being updated</h2>
                <span className="log-spinner" aria-label="Updating profile" />
              </div>
            ) : null}

            {step === "success" ? (
              <div className="log-feedback">
                <h2>Your profile was updated!</h2>
                <img className="log-success-mark" src="/utilities/Checkmark.png" alt="" />
              </div>
            ) : null}

            {step === "error" ? (
              <div className="log-feedback">
                <h2>{error || "Your profile couldn't be updated. Please try later"}</h2>
                <button className="movie-beta-close" onClick={closeEditor} aria-label="Close profile update error" type="button">
                  <X size={34} />
                </button>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                void selectFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

async function compressAvatar(file: File) {
  const image = await loadFileImage(file);
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  const sourceSize = Math.min(image.width, image.height);
  const sourceX = (image.width - sourceSize) / 2;
  const sourceY = (image.height - sourceSize) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.78);
}

function loadFileImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}
