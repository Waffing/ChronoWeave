import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parent.parent
out = root / 'artifacts'
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1100}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='进入经纬织史').click()
    page.locator('.astrolabe').wait_for()
    assert page.locator('[data-node]').count() == 8
    assert '牛顿' in page.locator('.detail-scroll h2').inner_text()
    page.screenshot(path=str(out/'chronoweave-desktop.png'), full_page=True)
    results.append('Default Newton archive and 8-node ring rendered')
    page.get_by_role('button', name='科学数学', exact=True).click()
    assert page.locator('[data-node]').count() >= 1
    page.locator('[data-node]').first.click()
    assert 'active' in page.get_by_role('button',name='科学数学',exact=True).get_attribute('class')
    results.append('Field filter survives node selection')
    page.get_by_role('button',name='全部',exact=True).click()
    page.get_by_role('button',name='双轨',exact=True).click()
    assert page.locator('.time-node').count() == 8
    page.screenshot(path=str(out/'chronoweave-timeline.png'),full_page=True)
    page.get_by_role('button',name='星盘',exact=True).click()
    dial = page.locator('.astrolabe')
    dial.scroll_into_view_if_needed()
    box = dial.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    before = page.evaluate('scrollY')
    page.mouse.wheel(0,-180)
    page.wait_for_timeout(120)
    assert page.evaluate('scrollY') == before
    assert '100%' not in page.locator('.dial-tools').inner_text()
    page.get_by_role('button',name='重置星盘',exact=True).click()
    assert '100%' in page.locator('.dial-tools').inner_text()
    box = dial.bounding_box()
    x,y=box['x']+box['width']/2,box['y']+box['height']/2
    old=page.locator('.astrolabe [data-node]').first.locator('circle').first.get_attribute('cx')
    page.mouse.move(x+65,y+30);page.mouse.down();page.mouse.move(x+20,y+95,steps=12);page.mouse.up()
    new=page.locator('.astrolabe [data-node]').first.locator('circle').first.get_attribute('cx')
    assert old != new
    page.get_by_role('button',name='重置星盘',exact=True).click()
    results.append('Wheel zoom prevents page scroll; drag rotates; reset restores scale')
    page.locator('[data-node="newton"]').click()
    page.get_by_role('tab',name='蝴蝶效应推演').click()
    page.get_by_role('button',name='触发时空折叠').click()
    assert page.locator('.domino-chain section').count() == 3
    assert page.locator('.impacted').count() >= 1
    page.locator('.detail-scroll').evaluate('(el)=>el.scrollTop=el.scrollHeight')
    with page.expect_download() as download_info:
        page.get_by_role('button',name='导出时空推演手札').click()
    download=download_info.value
    download.save_as(str(out/'ChronoWeave-newton-removed.png'))
    assert (out/'ChronoWeave-newton-removed.png').read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
    results.append('Removed scenario shows 3 impact levels and downloads real PNG')
    page.locator('.detail-scroll').evaluate('(el)=>el.scrollTop=0')
    page.screenshot(path=str(out/'chronoweave-simulation.png'),full_page=True)
    page.get_by_role('button',name='推迟 200 年',exact=True).click()
    page.get_by_role('button',name='触发时空折叠').click()
    assert page.locator('.delay strong').inner_text()
    page.get_by_role('button',name='04').count()
    page.locator('.era-switcher button').nth(3).click()
    assert page.locator('.impacted').count() >= 2
    assert '牛顿' in page.locator('.return-source').inner_text()
    page.reload();page.wait_for_load_state('networkidle')
    assert page.locator('.simulation-active').count()==1
    assert '牛顿' in page.locator('.detail-scroll h2').inner_text()
    assert 'active' in page.get_by_role('button',name='推迟 200 年',exact=True).get_attribute('class')
    results.append('Delayed scenario and source survive cross-era navigation and reload')
    page.get_by_role('button',name='恢复真实历史').click()
    for i,count in [(0,9),(1,8),(2,8),(3,8)]:
        page.locator('.era-switcher button').nth(i).click()
        assert page.locator('[data-node]').count()==count
    results.append('All four eras render 9 / 8 / 8 / 8 nodes')
    page.locator('.era-switcher button').nth(1).click()
    page.get_by_role('button',name='自动巡航演进',exact=True).click()
    first=page.locator('.detail-scroll h2').inner_text()
    page.wait_for_timeout(6800)
    second=page.locator('.detail-scroll h2').inner_text()
    assert first != second
    page.get_by_role('button',name='暂停巡航',exact=True).click()
    results.append('Cruise advances historical focus and pauses')
    page.get_by_role('button',name='静音机械音效',exact=True).click()
    page.reload();page.wait_for_load_state('networkidle')
    assert page.get_by_role('button',name='开启机械音效',exact=True).count()==1
    page.get_by_role('button',name='开启机械音效',exact=True).click()
    page.get_by_role('button',name='评委 30 秒体验指南').click()
    assert page.locator('dialog[open]').count()==1
    page.get_by_role('button',name='关闭体验指南').click()
    results.append('Mute setting persists; guide reopens and closes')
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(out/'chronoweave-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    external=page.evaluate("performance.getEntriesByType('resource').filter(r=>!r.name.startsWith(location.origin)&&!r.name.startsWith('data:')).map(r=>r.name)")
    assert not external, external
    assert not errors, errors
    results.append('390px viewport has no document overflow; zero page errors and external resource requests')
    report={'status':'PASS','browser':'Chromium headless (fresh isolated context)','checks':results,'pageErrors':errors,'externalResources':external}
    (out/'browser-acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    browser.close()
