from oauth2client.service_account import ServiceAccountCredentials
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.discovery import build

from pymongo import MongoClient
from dotenv import dotenv_values
from pathlib import Path

import mediapipe as mp
import subprocess
import argparse
import cv2
import sys
import io
import os


def run_facemesh(video_name):
    path = Path(__file__).parent.absolute()

    mp_drawing = mp.solutions.drawing_utils
    mp_face_mesh = mp.solutions.face_mesh

    drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1)
    # Load the video
    cap = cv2.VideoCapture(f'{path}/uploads/raw/{video_name}.mp4')
    # Get de codec code
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    # float `width`
    width = int(cap.get(3))
    # float `height`
    height = int(cap.get(4))
    # FPS of the original video
    fps = cap.get(cv2.CAP_PROP_FPS)
    # Prepere the out video
    out = cv2.VideoWriter(f'{path}/uploads/facemesh/facemesh-{video_name}.mp4',
                          fourcc, fps, (width, height), True)
    print(f'Running face mesh for {video_name}...')

    with mp_face_mesh.FaceMesh(min_detection_confidence=0.5,
                               min_tracking_confidence=0.5) as face_mesh:
        while cap.isOpened():
            success, image = cap.read()
            if not success or image is None:
                break
            image = cv2.cvtColor(cv2.flip(image, 1), cv2.COLOR_BGR2RGB)
            image.flags.writeable = False
            results = face_mesh.process(image)
            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    mp_drawing.draw_landmarks(
                        image=image,
                        landmark_list=face_landmarks,
                        connections=mp_face_mesh.FACE_CONNECTIONS,
                        landmark_drawing_spec=drawing_spec,
                        connection_drawing_spec=drawing_spec)
            out.write(image)
    print(f'Done running face mesh for {video_name}...')
    cap.release()
    out.release()


def cut_selection_video(timestamps, video_name):
    path = Path(__file__).parent.absolute()
    cap = cv2.VideoCapture(f'{path}/uploads/raw/{video_name}.mp4')
    # Get de codec code
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    # float `width`
    width = int(cap.get(3))
    # float `height`
    height = int(cap.get(4))
    # FPS of the original video
    fps = cap.get(cv2.CAP_PROP_FPS)
    # Prepere the out video
    index = 0
    for start, stop in timestamps:
        start_frame_count = fps * start
        stop_frame_count = fps * stop
        out = cv2.VideoWriter(f'{path}/uploads/cut/cut-{video_name}-{start}-{stop}.mp4',
                              fourcc, fps, (width, height), True)
        while cap.isOpened():
            success, image = cap.read()
            index += 1
            if not success or index > stop_frame_count:
                break
            if start_frame_count <= index < stop_frame_count:
                out.write(image)
        out.release()
    cap.release()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-m', '--mongo', required=False,
                    help='Connect to mongoDB and get collections, \
                    values should be local or remote, default=remote.\
                    Exemple: python dataviz.py -m remote')
    ap.add_argument('-g', '--gdrive', required=False, action='store_true', help='download images from gdrive')
    ap.add_argument('-f', '--facemesh', required=False, action='store_true', help='Apply facemesh model to the videos')
    ap.add_argument('-t', '--timestamp', required=False, action='store_true', help='Cutting the video into chunks according to timestamp')
 
    args = ap.parse_args()

    if len(sys.argv) == 1:
        ap.print_help()

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

    MONGO = args.mongo
    GDRIVE = args.gdrive
    FACEMESH = args.facemesh
    TIMESTAMP = args.timestamp

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
    # Iterate over all document from the collection
    videos = []
    print(f'Loading data from {MONGO} mongoDB database...')
    list_positions = []
    list_timestamp = []
    for i, document in enumerate(collection[collection_name].find(), 1):
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
                if not Path(f'{path}/uploads/{video_id}.mp4').is_file():
                    print(f'Converting video {i} to mp4...')
                    subprocess.run(f'ffmpeg -i uploads/raw/{video_id}.webm uploads/raw/{video_id}.mp4',
                                   shell=True,
                                   stdout=subprocess.DEVNULL,
                                   stderr=subprocess.STDOUT)

            videos.append(video_id)
            # Append info to list
            for info in video_info:
                x, y = info['x'], info['y']
                begin, end = info['timestampInit'], info['timestampEnd']
                positions.append((x, y))
                timestamp.append((begin, end))

            list_positions.append(positions)
            list_timestamp.append(timestamp)

    if GDRIVE:
        print('Files downloaded to uploads directory')

    if TIMESTAMP:
        for i, video in enumerate(videos):
            print(f'Cutting video {video}...')
            cut_selection_video(list_timestamp[i], video)

    if FACEMESH:
        # Apply the facemesh model
        print('Running facemesh model...')
        for video_id in videos:
            print(f'video {video_id}')
            if not Path(f'{path}/uploads/facemesh/facemesh-{video_id}.mp4').is_file():
                run_facemesh(video_id)
            else:
                print('Facemesh already applied to the video')


if __name__ == '__main__':
    main()
