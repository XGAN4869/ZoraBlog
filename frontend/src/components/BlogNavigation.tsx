import { useState } from "react";
import { Link } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { articleModules, categoryArticles } from "@/data/navigation";

export function BlogNavigation() {
  const [value, setValue] = useState<string | null>(null);
  const close = () => setValue(null);
  return (
    <NavigationMenu
      className="desktop-nav"
      aria-label="主导航"
      value={value}
      onValueChange={setValue}
    >
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            render={<Link to="/" />}
            className={navigationMenuTriggerStyle()}
            onClick={close}
          >
            首页
          </NavigationMenuLink>
        </NavigationMenuItem>
        {articleModules.map((module) => (
          <NavigationMenuItem key={module.id} value={module.id}>
            <NavigationMenuTrigger>{module.label}</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div
                className={`category-menu ${module.categories.length > 1 ? "category-menu-wide" : ""}`}
              >
                {module.categories.map((category) => (
                  <section key={category}>
                    <div className="category-menu-heading">
                      <span>{category}</span>
                      <small>{categoryArticles(category).length} 篇</small>
                    </div>
                    {categoryArticles(category).map((article) => (
                      <NavigationMenuLink
                        key={article.slug}
                        render={<Link to={`/articles/${article.slug}`} />}
                        onClick={close}
                      >
                        {article.title}
                      </NavigationMenuLink>
                    ))}
                  </section>
                ))}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
        <NavigationMenuItem>
          <NavigationMenuLink
            render={<Link to="/#projects" />}
            className={navigationMenuTriggerStyle()}
            onClick={close}
          >
            项目
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            render={<Link to="/#about" />}
            className={navigationMenuTriggerStyle()}
            onClick={close}
          >
            关于
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
