import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export async function transcodeToHls(params: {
  input: string;
  outputDir: string;
}) {
  await mkdir(params.outputDir, { recursive: true });
  const manifestPath = path.join(params.outputDir, "index.m3u8");

  const args = [
    "-y",
    "-i",
    params.input,
    "-profile:v",
    "main",
    "-vf",
    "scale=w=1280:h=-2",
    "-c:v",
    "h264",
    "-c:a",
    "aac",
    "-hls_time",
    "6",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    path.join(params.outputDir, "segment_%03d.ts"),
    manifestPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  return { manifestPath };
}
