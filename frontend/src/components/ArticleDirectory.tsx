import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { BookOpen, ChevronRight, Folder } from "lucide-react";
import { articleModules, categoryArticles } from "@/data/navigation";
import {
  DIRECTORY_EASE,
  useDirectoryMotion,
} from "@/hooks/use-directory-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/base/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/base/sidebar";

function AnimatedCategoryPanel({
  children,
  reducedMotion,
}: {
  children: ReactNode;
  reducedMotion: boolean;
}) {
  const present = useIsPresent();
  return (
    <CollapsibleContent
      keepMounted
      hidden={false}
      inert={!present}
      aria-hidden={!present}
      render={
        <motion.div
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.24,
            ease: DIRECTORY_EASE,
          }}
        />
      }
    >
      {children}
    </CollapsibleContent>
  );
}

function DirectoryCategory({
  category,
  slug,
  expanded,
  reducedMotion,
}: {
  category: string;
  slug: string;
  expanded: boolean;
  reducedMotion: boolean;
}) {
  const items = categoryArticles(category);
  const [open, setOpen] = useState(() =>
    items.some((article) => article.slug === slug),
  );
  const { setOpen: setSidebarOpen, setOpenMobile } = useSidebar();
  const panelOpen = expanded && open;
  const transition = {
    duration: reducedMotion ? 0 : 0.24,
    ease: DIRECTORY_EASE,
  };

  return (
    <Collapsible
      open={panelOpen}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !expanded) setSidebarOpen(true);
      }}
      className="group/category"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={category}
            className="directory-category-button"
          />
        }
      >
        <Folder />
        <motion.span
          className="whitespace-nowrap"
          initial={false}
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={transition}
        >
          {category}
        </motion.span>
        <motion.span
          className="ml-auto shrink-0"
          initial={false}
          animate={{ rotate: panelOpen ? 90 : 0, opacity: expanded ? 1 : 0 }}
          transition={transition}
        >
          <ChevronRight />
        </motion.span>
      </CollapsibleTrigger>
      <SidebarMenuBadge className="right-7">{items.length}</SidebarMenuBadge>
      <AnimatePresence initial={false}>
        {panelOpen && (
          <AnimatedCategoryPanel key="content" reducedMotion={reducedMotion}>
            <SidebarMenuSub className="group-data-[collapsible=icon]:flex">
              {items.map((article) => (
                <SidebarMenuSubItem key={article.slug}>
                  <SidebarMenuSubButton
                    render={<Link to={`/articles/${article.slug}`} />}
                    isActive={article.slug === slug}
                    aria-current={article.slug === slug ? "page" : undefined}
                    title={article.title}
                    onClick={() => setOpenMobile(false)}
                  >
                    <span>{article.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </AnimatedCategoryPanel>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}

export function ArticleDirectory({ slug }: { slug: string }) {
  const { isMobile, open, setOpenMobile } = useSidebar();
  const { ref, reducedMotion } = useDirectoryMotion(open, isMobile);
  const expanded = isMobile || open;
  const transition = {
    duration: reducedMotion ? 0 : 0.32,
    ease: DIRECTORY_EASE,
  };

  return (
    <Sidebar collapsible="icon">
      <nav ref={ref} aria-label="文章分类目录" className="flex h-full flex-col">
        <SidebarHeader className="flex-row items-center justify-between gap-0">
          <motion.div
            className="overflow-hidden"
            initial={false}
            animate={{ width: expanded ? 192 : 0, opacity: expanded ? 1 : 0 }}
            transition={transition}
            inert={!expanded}
            aria-hidden={!expanded}
          >
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to="/#articles" />}
                  onClick={() => setOpenMobile(false)}
                >
                  <BookOpen />
                  <span>文章目录</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </motion.div>
          <SidebarTrigger
            className="shrink-0"
            aria-label={
              isMobile ? "关闭文章目录" : open ? "折叠文章目录" : "展开文章目录"
            }
          />
        </SidebarHeader>
        <SidebarContent>
          {articleModules.map((module) => (
            <SidebarGroup key={module.id}>
              <SidebarGroupLabel
                className="overflow-hidden transition-none"
                render={
                  <motion.div
                    initial={false}
                    animate={{
                      height: expanded ? 32 : 0,
                      opacity: expanded ? 1 : 0,
                      marginTop: 0,
                    }}
                    transition={transition}
                    aria-hidden={!expanded}
                  />
                }
              >
                {module.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {module.categories.map((category) => (
                  <DirectoryCategory
                    key={`${category}-${slug}`}
                    category={category}
                    slug={slug}
                    expanded={expanded}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </nav>
    </Sidebar>
  );
}
