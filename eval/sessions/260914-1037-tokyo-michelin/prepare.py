"""Extract observed source facts; the shared TS contract validates the boarding output."""
from pathlib import Path
import collections
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent
OUTPUTS = ROOT / 'outputs'

def read(path):
    return json.loads(path.read_text())

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def unescape(value):
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda match: chr(int(match[1], 16)), value)

inventory = read(ROOT / 'list-identities.json')['restaurants']
annual = read(OUTPUTS / 'ja-stars-reveal.json')
bib_annual = read(OUTPUTS / 'ja-bib-announcement.json')
# The annual article explicitly labels these eleven as New, separately from seven promotions.
star_new_names = {'佐々／Sassa', 'マノワ／MANOIR', '鮨 大矢／Sushi Oya', '匠 達広／Takumi Tatsuhiro',
                  '百薬 by 徳山鮓／Hyakuyaku by Tokuyamazushi', 'カオ／KHAO', '赤坂 島袋／Akasaka Shimabukuro',
                  'エーヴィック／EWIG', '鮨 田中／Sushi Tanaka', 'マージ／mærge', 'ラ グロワ／La Gloire'}
star_new = {link['url'].split('/restaurant/')[-1] for link in annual['links'] if link['text'] in star_new_names}
bib_new = {link['url'].split('/restaurant/')[-1] for link in bib_annual['links'] if '/tokyo/restaurant/' in link['url']}
assert len(star_new) == 11 and len(bib_new) == 16
records = collections.defaultdict(list)
evidence = []
rating_by_listing = {'1 star': 1, '2 star': 2, '3 star': 3, 'ONE_STAR': 1, 'TWO_STARS': 2, 'THREE_STARS': 3, 'bib': 0, 'BIB_GOURMAND': 0}
for item in sorted(inventory, key=lambda item: int(item['upstreamId'])):
    path = OUTPUTS / f"restaurant-{item['upstreamId']}-ja.json"
    source = read(path)
    data = source['restaurant']
    assert source['upstreamId'] == item['upstreamId'], item
    assert data['award']['dateAwarded'] == '2026', item
    assert source['canonical'].split('/restaurant/')[-1] == item['url'].split('/restaurant/')[-1], item
    award = unescape(data['award']['awardFor'])
    rating = next((number for label, number in [('三つ星', 3), ('二つ星', 2), ('一つ星', 1), ('ビブグルマン', 0)] if label in award), None)
    assert rating == rating_by_listing[item['distinction']], (item, award)
    fields = dict(field for field in source['fields'] if len(field) == 2)
    japanese_name, separator, english_name = source['name'].partition('／')
    record = dict(id=len(records[item['guide']]) + 1, name=japanese_name, name_en=english_name if separator else item['name_en'],
                  city='tokyo', guide_type=item['guide'], edition_year=2026, star_rating=rating,
                  cuisine=fields['料理カテゴリー:'], area=source['district'], address=source['address'],
                  lat=data['latitude'], lon=data['longitude'], geo_source='michelin_exact',
                  guide_url=source['canonical'], currency=data['currenciesAccepted'], price_range=fields['料金:'])
    assert record['currency'] == 'JPY'
    if data.get('telephone'):
        record['phone'] = data['telephone']
    website = next((link['url'] for link in source['links'] if link['text'] == 'ウェブサイトを訪問'), None)
    if website:
        record['website'] = website
    if item['upstreamId'] == '1196238':
        # A specific current dinner menu, not an average or a grade-derived amount.
        menu = (OUTPUTS / 'est-menu.html').read_text()
        assert '27,000' in menu and 'include 15% service charge and applicable tax' in menu
        record['price'] = 'Dinner: TERROIR – EIGHT COURSES\nJPY 27,000\nAll prices are in Japanese Yen and include 15% service charge and applicable tax.'
    if source['canonical'].split('/restaurant/')[-1] in (star_new if rating else bib_new):
        record['is_new'] = True
    records[item['guide']].append(record)
    evidence.append(dict(guide_type=item['guide'], id=record['id'], upstream_id=item['upstreamId'],
                         canonical=source['canonical'], address=record['address'], name=source['name'],
                         award=award, award_year=data['award']['dateAwarded'], list_pages=item['listPages'],
                         captured_at=source['finishedAt'], source_file=str(path.relative_to(ROOT)),
                         sha256=hashlib.sha256(path.read_bytes()).hexdigest()))

# A missing current page must not erase an explicitly named annual award.
kibun_url = next(link['url'] for link in annual['links'] if link['text'] == '氣分／KIBUN')
assert '（一つ星／現代風料理）プロモ' in annual['text']
record = dict(id=len(records['michelin-starred']) + 1, name='氣分', name_en='KIBUN', city='tokyo',
              guide_type='michelin-starred', edition_year=2026, star_rating=1, cuisine='現代風料理',
              guide_url=kibun_url, lat=None, lon=None, geocode_success=False)
records['michelin-starred'].append(record)
evidence.append(dict(guide_type='michelin-starred', id=record['id'], upstream_id=None, canonical=kibun_url,
                     name='氣分／KIBUN', award='一つ星／現代風料理、プロモーテッド', award_year='2026',
                     source_file='outputs/ja-stars-reveal.json', captured_at=annual['finishedAt'],
                     exception='Annual award retained. Official detail now reports restaurant not found; address and coordinates unresolved.'))

for guide, rows in records.items():
    write(OUTPUTS / f'{guide}-raw.json', rows)
write(ROOT / 'record-evidence.json', evidence)
write(ROOT / 'annual-new-identities.json', dict(star_new=sorted(star_new), bib_new=sorted(bib_new),
    sources=[annual['finalUrl'], bib_annual['finalUrl']], meaning='Only the annual New labels are true; promoted and remaining entries retain unknown newness.'))
print({guide: len(rows) for guide, rows in records.items()})
print(collections.Counter(row['cuisine'] for rows in records.values() for row in rows))
