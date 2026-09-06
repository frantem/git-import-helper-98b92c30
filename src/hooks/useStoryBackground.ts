import { useState } from "react";
import { STORY_BACKGROUNDS, type StoryBackground } from "@/components/seller/story/storyBackgrounds";

/** Состояние выбранного фона + загрузка своего через crop-диалог. */
export function useStoryBackground() {
  const [customBg, setCustomBg] = useState<StoryBackground | null>(null);
  const [background, setBackground] = useState<StoryBackground>(STORY_BACKGROUNDS[0]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropped = (blob: Blob) => {
    setCropSrc(null);
    if (customBg?.image?.startsWith("blob:")) URL.revokeObjectURL(customBg.image);
    const bg: StoryBackground = { id: "custom", label: "Своё", image: URL.createObjectURL(blob) };
    setCustomBg(bg);
    setBackground(bg);
  };

  const allBackgrounds = customBg ? [customBg, ...STORY_BACKGROUNDS] : STORY_BACKGROUNDS;

  return {
    background, setBackground, allBackgrounds,
    cropSrc, cancelCrop: () => setCropSrc(null),
    handleUploadFile, handleCropped,
  };
}
