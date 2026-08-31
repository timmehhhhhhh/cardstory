import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";

export function Logo() {
  return (
    <Link href="/explore" className="flex items-center shrink-0">
      <Image
        src="/brand/cardstory-wordmark.png"
        alt={APP_NAME}
        width={900}
        height={325}
        priority
        unoptimized
        className="h-8 w-auto sm:h-9 dark:hidden"
      />
      <Image
        src="/brand/cardstory-wordmark-dark.png"
        alt={APP_NAME}
        width={900}
        height={325}
        priority
        unoptimized
        className="hidden h-8 w-auto sm:h-9 dark:block"
      />
    </Link>
  );
}
