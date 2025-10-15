import io
import sys
from pathlib import Path
from app import create_app

app = create_app()


def main():
    csv_path = Path(__file__).parent / 'data' / 'sample_people.csv'
    if not csv_path.exists():
        print('No sample_people.csv found', file=sys.stderr)
        sys.exit(1)

    with app.test_client() as c:
        data = {
            'file': (io.BytesIO(csv_path.read_bytes()), 'sample_people.csv')
        }
        resp = c.post('/api/imports/people-csv', data=data, content_type='multipart/form-data')
        print('Status:', resp.status_code)
        print(resp.json)


if __name__ == '__main__':
    main()
