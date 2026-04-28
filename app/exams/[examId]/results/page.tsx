'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NovaLoader from '@/components/NovaLoader';

/**
 * /exams/[examId]/results — redirects to first graded student's results page.
 */
export default function ResultsIndexPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/exams/${examId}`)
      .then((r) => r.json())
      .then((data) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const graded = data.students?.filter((s: any) => s._count?.gradedAnswers > 0);
        if (graded && graded.length > 0) {
          router.replace(`/exams/${examId}/results/${graded[0].id}`);
        } else {
          router.replace(`/exams/${examId}`);
        }
      })
      .catch(() => router.replace(`/exams/${examId}`));
  }, [examId, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <NovaLoader size="xl" text="Loading results..." />
    </div>
  );
}
