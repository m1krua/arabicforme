import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Expand,
  Minus,
  Plus,
  Upload,
} from 'lucide-react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useProgress } from '../state/useProgress';
import { useInterfaceText } from '../state/useInterfaceText';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PdfReader() {
  const { page: pagePath } = useParams();
  const navigate = useNavigate();
  const { progress, updateProgress, recordActivity } = useProgress();
  const t = useInterfaceText();
  const locale = progress.translationLanguage === 'ky' ? 'ky' : 'ru';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const loadSequenceRef = useRef(0);
  const pageParameter = pagePath === undefined ? null : Number(pagePath);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [fileName, setFileName] = useState('');
  const [pageNumber, setPageNumber] = useState(
    Number.isInteger(pageParameter) && pageParameter !== null && pageParameter > 0
      ? pageParameter
      : progress.lastReadPage,
  );
  const [zoom, setZoom] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [containerWidth, setContainerWidth] = useState(720);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const element = pageContainerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setContainerWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pdf === null) return;
    const validPage = Math.min(Math.max(1, pageNumber), pdf.numPages);
    const canvas = canvasRef.current;
    const container = pageContainerRef.current;
    if (!canvas || !container) return;

    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null =
      null;
    pdf.getPage(validPage).then((page) => {
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(240, containerWidth - 32);
      const scale = fitToWidth
        ? Math.min(2, availableWidth / baseViewport.width)
        : zoom;
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * outputScale });
      const displayViewport = page.getViewport({ scale });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.ceil(displayViewport.width)}px`;
      canvas.style.height = `${Math.ceil(displayViewport.height)}px`;
      const context = canvas.getContext('2d');
      if (context === null) {
        setRenderError(t('Браузер не смог создать холст для отображения страницы.'));
        return;
      }
      renderTask = page.render({ canvas, canvasContext: context, viewport });
      return renderTask.promise;
    }).catch((cause: unknown) => {
      if (!cancelled && !(cause instanceof Error && cause.name === 'RenderingCancelledException')) {
        setRenderError(cause instanceof Error ? cause.message : t('Не удалось отобразить страницу PDF.'));
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [containerWidth, fitToWidth, pageNumber, pdf, t, zoom]);

  useEffect(() => {
    return () => {
      loadSequenceRef.current += 1;
      void loadingTaskRef.current?.destroy();
    };
  }, []);

  function goToPage(requestedPage: number) {
    if (!pdf || !Number.isFinite(requestedPage)) return;
    const target = Math.min(Math.max(1, Math.trunc(requestedPage)), pdf.numPages);
    setPageNumber(target);
    setRenderError(null);
    updateProgress((current) => ({ ...current, lastReadPage: target }));
    recordActivity();
    navigate(`/book/${target}`);
  }

  async function openSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLocaleLowerCase().endsWith('.pdf')) {
      setError(t('Выберите файл PDF.'));
      return;
    }

    setLoading(true);
    setError(null);
    setRenderError(null);
    setPdf(null);
    const request = loadSequenceRef.current + 1;
    loadSequenceRef.current = request;
    void loadingTaskRef.current?.destroy();
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (request !== loadSequenceRef.current) return;
      const task = getDocument({ data: bytes });
      loadingTaskRef.current = task;
      const document = await task.promise;
      if (request !== loadSequenceRef.current) return;
      setPdf(document);
      setFileName(file.name);
      const requested = Number.isInteger(pageParameter) && pageParameter !== null && pageParameter > 0
        ? pageParameter
        : progress.lastReadPage;
      const initialPage = Math.min(requested, document.numPages);
      setPageNumber(initialPage);
      updateProgress((current) => ({ ...current, lastReadPage: initialPage }));
      recordActivity();
      navigate(`/book/${initialPage}`, { replace: true });
    } catch (cause) {
      if (request === loadSequenceRef.current) {
        const message = cause instanceof Error ? cause.message : t('Не удалось открыть этот PDF.');
        setError(`${t('Не удалось открыть PDF. Проверьте, что файл не повреждён.')} ${message}`);
      }
    } finally {
      if (request === loadSequenceRef.current) setLoading(false);
    }
  }

  function toggleBookmark() {
    updateProgress((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(pageNumber)
        ? current.bookmarks.filter((page) => page !== pageNumber)
        : [...current.bookmarks, pageNumber].sort((left, right) => left - right),
    }));
  }

  async function toggleFullscreen() {
    const container = pageContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Не удалось включить полноэкранный режим.'));
    }
  }

  return (
    <section className="page-stack" aria-labelledby="book-heading">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t('Оригинальный источник')}</span>
          <h1 id="book-heading">{t('Онлайн-книга')}</h1>
          <p>{t('Откройте PDF с устройства. Файл не отправляется на сервер; после перезагрузки выберите его снова.')}</p>
        </div>
        <label className="button button-primary upload-button">
          <Upload size={18} aria-hidden="true" />
          <span>{t(pdf ? 'Выбрать другой PDF' : 'Открыть PDF')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={openSelectedFile}
            aria-label={t('Выбрать PDF-файл')}
          />
        </label>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="reader-card">
        <div className="reader-toolbar">
          <div className="reader-file" title={fileName}>
            <span className="status-dot" aria-hidden="true" />
            <span>{fileName || t('PDF не выбран')}</span>
          </div>
          <div className="reader-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setZoom((current) => Math.max(0.5, Math.round((current - 0.1) * 10) / 10))}
              disabled={!pdf || fitToWidth}
              aria-label={t('Уменьшить масштаб')}
              title={t('Уменьшить масштаб')}
            >
              <Minus size={18} />
            </button>
            <span className="zoom-value">{fitToWidth ? t('Авто') : `${Math.round(zoom * 100)}%`}</span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setZoom((current) => Math.min(2.5, Math.round((current + 0.1) * 10) / 10))}
              disabled={!pdf || fitToWidth}
              aria-label={t('Увеличить масштаб')}
              title={t('Увеличить масштаб')}
            >
              <Plus size={18} />
            </button>
            <button
              className={`icon-button ${fitToWidth ? 'is-active' : ''}`}
              type="button"
              onClick={() => setFitToWidth((current) => !current)}
              disabled={!pdf}
              aria-pressed={fitToWidth}
              title={t('Подогнать по ширине')}
            >
              <span className="fit-label">{t('По ширине')}</span>
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={toggleFullscreen}
              disabled={!pdf}
              aria-label={t('Полноэкранный режим')}
              title={t('Полноэкранный режим')}
            >
              <Expand size={18} />
            </button>
          </div>
        </div>

        <div className="pdf-stage" ref={pageContainerRef}>
          {loading ? (
            <div className="reader-empty" role="status">
              <span className="spinner" />
              <p>{t('Открываем PDF и подготавливаем страницы…')}</p>
              <span>{t('Большой файл может загружаться некоторое время.')}</span>
            </div>
          ) : pdf ? (
            <>
              {renderError && <div className="notice notice-error" role="alert">{renderError}</div>}
              <canvas ref={canvasRef} aria-label={`${t('Страница книги')} ${pageNumber}`} />
            </>
          ) : (
            <div className="reader-empty">
              <div className="empty-book-icon"><Upload size={28} /></div>
              <h2>{t('Книга ещё не открыта')}</h2>
              <p>{t('Выберите исходный PDF с устройства. Приложение загрузит и отрисует только текущую страницу.')}</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('Открыть PDF')}
              </button>
              {progress.lastReadPage > 1 && (
                <span>{t('Последнее чтение сохранено: страница')} {progress.lastReadPage}.</span>
              )}
            </div>
          )}
        </div>

        <div className="reader-footer">
          <div className="page-controls">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={!pdf || pageNumber <= 1}
              aria-label={t('Предыдущая страница')}
            >
              <ChevronLeft size={18} />
              <span>{t('Назад')}</span>
            </button>
            <label className="page-input-label">
              <span className="sr-only">{t('Номер страницы')}</span>
              <input
                aria-label={t('Номер страницы')}
                type="number"
                min={1}
                max={pdf?.numPages ?? undefined}
                value={pageNumber}
                disabled={!pdf}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  if (Number.isInteger(value) && value > 0 && value <= (pdf?.numPages ?? 0)) {
                    goToPage(value);
                  }
                }}
              />
            </label>
            <span className="page-count">{locale === 'ky' ? '/' : 'из'} {pdf?.numPages ?? '—'}</span>
            <button
              className="button button-quiet"
              type="button"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={!pdf || pageNumber >= pdf.numPages}
              aria-label={t('Следующая страница')}
            >
              <span>{t('Далее')}</span>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="bookmark-area">
            <button
              className={`button button-quiet ${progress.bookmarks.includes(pageNumber) ? 'bookmark-active' : ''}`}
              type="button"
              onClick={toggleBookmark}
              disabled={!pdf}
              aria-pressed={progress.bookmarks.includes(pageNumber)}
            >
              <Bookmark size={17} aria-hidden="true" />
              <span>{t(progress.bookmarks.includes(pageNumber) ? 'Убрать закладку' : 'Добавить закладку')}</span>
            </button>
            {progress.bookmarks.length > 0 && (
              <div className="bookmark-list" aria-label={t('Закладки')}>
                {progress.bookmarks.map((page) => (
                  <button
                    className={`bookmark-chip ${page === pageNumber ? 'is-current' : ''}`}
                    key={page}
                    type="button"
                    disabled={!pdf}
                    onClick={() => goToPage(page)}
                    aria-label={`${t('Открыть страницу')} ${page}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
