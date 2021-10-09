from oauth2client.service_account import ServiceAccountCredentials
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
from googleapiclient.discovery import build
from pprint import pprint

from pymongo import MongoClient
from dotenv import dotenv_values
from pathlib import Path
import math
from typing import List, Mapping, Optional, Tuple, Union

import mediapipe as mp
import subprocess
import argparse
import random
import json
import cv2
import sys
import io
import os
from mimetypes import MimeTypes

LEFT_EYE = [55, 114, 117, 53]
RIGHT_EYE = [285, 283, 346, 343]
MOUTH = [216, 436, 422, 202]
# NOSE = [231, 451, 426, 206]
NOSE = [221, 441, 391, 165]

def upload_images(service):
    mime = MimeTypes()
    path = Path(__file__).parent.absolute()
    folder = f'{path}/uploads/cut'
    files = sorted(os.listdir(folder))
    files_len = len(files)
    for i, filename in enumerate(files, 1):
        # if i < 2008:
        #     continue
        print(f'Uploading image {filename} {i}/{files_len}')

        filepath = os.path.join(folder, filename)
        file_metadata = {
            'name': filename,
            'parents': ['1kiU9K_pJ3hHCRb56r-vRgUNvlB64Kp3O']
        }

        media = MediaFileUpload(filepath,
                                mimetype='image/png')
                                # resumable=True)

        file = service.files().create(body=file_metadata,
                                  media_body=media,
                                  fields='id').execute()
        print(f"File uploaded succes! id: {file.get('id')}")

def _normalized_to_pixel_coordinates(
    normalized_x: float, normalized_y: float, image_width: int,
    image_height: int) -> Union[None, Tuple[int, int]]:
  """Converts normalized value pair to pixel coordinates."""

  # Checks if the float value is between 0 and 1.
  def is_valid_normalized_value(value: float) -> bool:
    return (value > 0 or math.isclose(0, value)) and (value < 1 or
                                                      math.isclose(1, value))

  if not (is_valid_normalized_value(normalized_x) and
          is_valid_normalized_value(normalized_y)):
    # TODO: Draw coordinates even if it's outside of the image bounds.
    return None
  x_px = min(math.floor(normalized_x * image_width), image_width - 1)
  y_px = min(math.floor(normalized_y * image_height), image_height - 1)
  return x_px, y_px


def run_facemesh(dataset):
    path = Path(__file__).parent.absolute()

    mp_drawing = mp.solutions.drawing_utils
    mp_face_mesh = mp.solutions.face_mesh

    drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1)
    folder = f'{path}/uploads/cut'
    with mp_face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5) as face_mesh:
        for filename in os.listdir(folder):
            video_info = dataset[f'{filename}']

            print(f'Running face mesh for {filename}...')

            image = cv2.imread(os.path.join(folder, filename))
            image = cv2.cvtColor(cv2.flip(image, 1), cv2.COLOR_BGR2RGB)
            image.flags.writeable = False
            results = face_mesh.process(image)
            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            if results.multi_face_landmarks:
                image_rows, image_cols, _ = image.shape
                thickness = 1
                color = (255, 0, 0)
                landmarks_list = results.multi_face_landmarks[0].landmark

                x1 = landmarks_list[LEFT_EYE[0]].x
                y1 = landmarks_list[LEFT_EYE[0]].y
                x2 = landmarks_list[LEFT_EYE[2]].x
                y2 = landmarks_list[LEFT_EYE[2]].y

                pt1 = _normalized_to_pixel_coordinates(x1, y1, image_cols, image_rows)
                pt2 = _normalized_to_pixel_coordinates(x2, y2, image_cols, image_rows)
                image = cv2.rectangle(image, pt1, pt2, color, thickness)
                video_info['LEFT_EYE'] = (pt1, pt2)

                x1 = landmarks_list[RIGHT_EYE[0]].x
                y1 = landmarks_list[RIGHT_EYE[0]].y
                x2 = landmarks_list[RIGHT_EYE[2]].x
                y2 = landmarks_list[RIGHT_EYE[2]].y

                pt1 = _normalized_to_pixel_coordinates(x1, y1, image_cols, image_rows)
                pt2 = _normalized_to_pixel_coordinates(x2, y2, image_cols, image_rows)
                image = cv2.rectangle(image, pt1, pt2, color, thickness)
                video_info['RIGHT_EYE'] = (pt1, pt2)
                x1 = landmarks_list[MOUTH[0]].x
                y1 = landmarks_list[MOUTH[0]].y
                x2 = landmarks_list[MOUTH[2]].x
                y2 = landmarks_list[MOUTH[2]].y

                pt1 = _normalized_to_pixel_coordinates(x1, y1, image_cols, image_rows)
                pt2 = _normalized_to_pixel_coordinates(x2, y2, image_cols, image_rows)
                image = cv2.rectangle(image, pt1, pt2, color, thickness)
                video_info['MOUTH'] = (pt1, pt2)

                x1 = landmarks_list[NOSE[0]].x
                y1 = landmarks_list[NOSE[0]].y
                x2 = landmarks_list[NOSE[2]].x
                y2 = landmarks_list[NOSE[2]].y

                pt1 = _normalized_to_pixel_coordinates(x1, y1, image_cols, image_rows)
                pt2 = _normalized_to_pixel_coordinates(x2, y2, image_cols, image_rows)
                image = cv2.rectangle(image, pt1, pt2, color, thickness)
                video_info['NOSE'] = (pt1, pt2)

            cv2.imwrite(f'{path}/uploads/facemesh/{filename}', image)


def cut_selection_video(info, video_name, datasetjson):
    path = Path(__file__).parent.absolute()
    # Open video capture
    cap = cv2.VideoCapture(f'{path}/uploads/raw/{video_name}.mp4')
    # FPS of the original video
    fps = cap.get(cv2.CAP_PROP_FPS)
    # Prepere the out video
    index = 0
    positions = info[0]
    timestamps = info[1]
    for i, time in enumerate(timestamps):
        start, stop = time
        start_frame_count = fps * start
        stop_frame_count = fps * stop
        target = positions[i]
        count = 0
        while cap.isOpened():
            success, image = cap.read()
            index += 1
            if not success or index > stop_frame_count:
                break
            if start_frame_count <= index < stop_frame_count:
                continue
            if count < 10 and random.random() < 0.8:
                name = f'frame-{count}-{video_name}-{target[0]}-{target[1]}.png'
                cv2.imwrite(f'{path}/uploads/cut/{name}', image)
                datasetjson[name] = {'label': target}
                count += 1
        print(f'frames: {count}')
    cap.release()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-m', '--mongo', required=False, help = 'Connect to mongoDB and get collections, \
                    values should be local or remote, default=remote. Exemple: python dataviz.py -m remote')
    ap.add_argument('-g', '--gdrive', required=False, action='store_true', help = 'download images from gdrive')
    ap.add_argument('-f', '--facemesh', required=False, action='store_true',help = 'Apply facemesh model to the videos')
    ap.add_argument('-t', '--timestamp', required=False, action='store_true', help='Cutting the video into chunks according to timestamp')
    ap.add_argument('-s', '--samples', required=False, help='Number of samples to apply the API function')
    ap.add_argument('-u', '--upload', required=False, action='store_true', help = 'Upload images to gdrive')
 
    args = ap.parse_args()

    if len(sys.argv) == 1:
        ap.print_help()
        sys.exit(1)

    path = Path(__file__).parent.absolute()

    # Check if uploads dir exits
    if not Path(f'{path}/uploads/').is_dir():
        print('Uploads dir do not exists')
        os.mkdir(Path(f'{path}/uploads'))
        print('Creating uploads dir...')
    # Check if raw dir exits
    if not Path(f'{path}/uploads/raw').is_dir():
        print('Raw dir do not exists')
        os.mkdir(Path(f'{path}/uploads/raw'))
        print('Creating raw uploads dir...')
    # Check if cut dir exits
    if not Path(f'{path}/uploads/cut').is_dir():
        print('Cut dir do not exists')
        os.mkdir(Path(f'{path}/uploads/cut'))
        print('Creating cut uploads dir...')
    # Check if facemesh dir exits
    if not Path(f'{path}/uploads/facemesh').is_dir():
        print('Facemesh dir do not exists')
        os.mkdir(Path(f'{path}/uploads/facemesh'))
        print('Creating facemesh uploads dir...')


    # Program's arguments
    MONGO = args.mongo
    GDRIVE = args.gdrive
    FACEMESH = args.facemesh
    TIMESTAMP = args.timestamp
    SAMPLES = int(args.samples) if args.samples is not None else float('inf')
    UPLOAD = args.upload

    config = dotenv_values(".env")
    # Config of the mongoDB
    db_name = 'eye-tracker'
    collection_name = 'datas'
    # Connect to mongoDB Atles cluster
    client = MongoClient(config['MONGO_URL'])
    # Get the collection from the eye-tracker database
    collection = client[db_name]
    # Using googleapi to download videos from gdrive
    if GDRIVE:
        scope = ['https://www.googleapis.com/auth/drive']
        credentials = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
        service = build('drive', 'v3', credentials=credentials)
        print('Connected to google drive api')

    if UPLOAD:
        scope = ['https://www.googleapis.com/auth/drive']
        credentials = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
        service = build('drive', 'v3', credentials=credentials)
        print('Connected to google drive api')

    # Iterate over all document from the collection
    videos = {}
    print(f'Loading data from {MONGO} mongoDB database...')
    # list_positions = []
    # list_timestamp = []
    for i, document in enumerate(collection[collection_name].find(), 1):
        if 'stream' not in document:
            continue
        for stream in document['stream']:
            video_id = stream['video']
            video_info = stream['info']

            # List of positions and timestamps
            positions = []
            timestamp = []

            if GDRIVE:
                # Download video from gdrive
                if not Path(f'{path}/uploads/raw/{video_id}.webm').is_file():
                    print(f'Downloading video {i} from google drive...')
                    request = service.files().get_media(fileId=video_id)
                    fh = io.FileIO(f'uploads/raw/{video_id}.webm', "wb")
                    downloader = MediaIoBaseDownload(fh, request)
                    done = False
                    while done is False:
                        _, done = downloader.next_chunk()
                else:
                    print('Video already exists')

                # Converting video from webm to mp4
                if not Path(f'{path}/uploads/raw/{video_id}.mp4').is_file():
                    print(f'Converting video {i} to mp4...')
                    subprocess.run(f'ffmpeg -i uploads/raw/{video_id}.webm uploads/raw/{video_id}.mp4',
                                   shell=True,
                                   stdout=subprocess.DEVNULL,
                                   stderr=subprocess.STDOUT)

            videos[video_id] = []
            # Append info to list
            res = stream['resolution'].split('x')
            for info in video_info:
                x, y = round(info['x'] / float(res[0]), 3), round(info['y'] / float(res[1]), 3)
                begin, end = info['timestampInit'], info['timestampEnd']
                positions.append((x, y))
                timestamp.append((begin, end))

            videos[video_id].append(positions)
            videos[video_id].append(timestamp)

    if GDRIVE:
        print('Files downloaded to uploads directory')

    if TIMESTAMP:
        datasetjson = {}
        for i, video in enumerate(videos):
            if i + 1 > SAMPLES:
                break
            print(f'Cutting video {video}...')
            cut_selection_video(videos[video], video, datasetjson)

        with open("dataset.json", "w") as f:
            print("Creating dataset json file...")
            json.dump(datasetjson, f)

    if FACEMESH:
        # Apply the facemesh model
        with open("dataset.json", "r+", encoding='utf-8') as f:
            data = json.load(f)
            print('Running facemesh model...')
            run_facemesh(data)
            f.seek(0)
            json.dump(data, f)
            f.truncate()

    if UPLOAD:
        upload_images(service)


if __name__ == '__main__':
    main()
