import { AppButton } from '#react/components/ui/AppButton'
import { useI18n } from '#react/i18n'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import WorkdirView from './WorkdirView'

/** Standalone skill workspace page (local disk + platform skills). */
export default function SkillWorkspaceView() {
  const navigate = useNavigate()
  const { panels } = useI18n()

  return (
    <main
      className="flex h-full min-h-0 flex-col bg-canvas text-surface select-text"
      data-test-id="skill-workspace-page"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-6">
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-hover hover:text-surface"
          aria-label="Back"
          onClick={() => void navigate('/dashboard')}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
          {panels.workdirTitle}
        </h1>
        <AppButton
          color="primary"
          variant="solid"
          size="sm"
          data-test-id="workspace-to-skills"
          onClick={() => void navigate('/skills')}
        >
          {panels.manageSkillsAction}
        </AppButton>
      </header>
      <WorkdirView />
    </main>
  )
}
