# amCharts geodata

Внешние контуры Ленинградской области, Санкт-Петербурга и соседних территорий
на карте «Диспетчерского мониторинга» (`EXECUTIVE_MAP_*` в `app.js`) получены
из пакета [`@amcharts/amcharts5-geodata`](https://www.npmjs.com/package/@amcharts/amcharts5-geodata)
5.1.6 (файлы `russiaHigh`, `finlandHigh`, `estoniaHigh`) и упрощены
скриптом `scripts/build-executive-map.py`.

Данные распространяются на условиях лицензии amCharts (файл `LICENSE` рядом),
которая требует сохранять этот файл и указывать источник. Подпись «Контуры: amCharts»
выводится в подвале карты.

Контур Ладожского озера — Natural Earth (public domain), через пакет `sane-topojson` (MIT).
