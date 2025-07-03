import Link from 'next/link'
import { BookOpenIcon } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { IconBadge } from './icon-badge'
import { CourseProgress } from './course-progress'
import Image from '@rc-component/image';


type CourseCardProps = {
  id: string
  title: string
  imageUrl: string
  chaptersLength: number
  price: number
  progress: number | null
  category: string
}

export default function CourseCard({
  id,
  title,
  imageUrl = "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yek1SMmhJSGtYWlJtaDNhdlA2MlcwWlViWWsifQ?width=80",
  chaptersLength,
  price,
  progress,
  category,
}: CourseCardProps) {
  imageUrl = imageUrl ? "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yek1SMmhJSGtYWlJtaDNhdlA2MlcwWlViWWsifQ?width=80" : "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yek1SMmhJSGtYWlJtaDNhdlA2MlcwWlViWWsifQ?width=80";


  return (
    <Link href={`/courses/${id}`}>
      <div className="group h-full overflow-hidden rounded-lg border p-3 transition hover:shadow-sm">
        <div className="relative aspect-video w-full overflow-hidden rounded-md">
          <Image className="object-cover" alt={title} src={imageUrl} />
          {/* <Image fill className="object-cover" alt={title} src={imageUrl} /> */}
        </div>

        <div className="flex flex-col pt-2">
          <div className="line-clamp-2 text-lg font-medium transition group-hover:text-primary md:text-base">
            {title}
          </div>
          <p className="text-xs text-muted-foreground">{category}</p>
          <div className="my-3 flex items-center gap-x-1 text-sm md:text-xs">
            <div className="flex items-center gap-x-1 text-slate-500">
              <IconBadge size="sm" icon={BookOpenIcon} />
              <span>
                {chaptersLength} {chaptersLength === 1 ? 'Chapter' : 'Chapters'}
              </span>
            </div>
          </div>

          {progress !== null ? (
            <CourseProgress variant={progress === 100 ? 'success' : 'default'} size="sm" value={progress} />
          ) : (
            <p className="text-md font-medium text-slate-700 md:text-sm">{formatPrice(price)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
