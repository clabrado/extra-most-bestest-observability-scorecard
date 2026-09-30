import React from "react";
import { Link } from "react-router-dom";
import { AppHeader, HelpMenu } from "@dynatrace/strato-components/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.Navigation>
        <AppHeader.Logo
          as={Link}
          to="/"
          appName="Extra Most Bestest Obsevability Scorecaard"
          appIcon="./assets/dynatrace-logo.png"
        />
      </AppHeader.Navigation>
      <AppHeader.Menus>
        <HelpMenu
          entries={{
            documentation: [
              {
                label: "Dynatrace developer docs",
                href: "https://developer.dynatrace.com",
                target: "_blank",
              },
            ],
            about: "default",
          }}
        />
      </AppHeader.Menus>
    </AppHeader>
  );
};
