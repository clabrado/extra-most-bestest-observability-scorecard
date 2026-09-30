import { PageLayout } from "@dynatrace/strato-components/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Scorecard } from "./pages/Scorecard";

export const App = () => {
  return (
    <PageLayout>
      <PageLayout.Header>
        <Header />
      </PageLayout.Header>
      <PageLayout.Content>
        <Routes>
          <Route path="/" element={<Scorecard />} />
          <Route path="/intent/:intentId" element={<Scorecard />} />
        </Routes>
      </PageLayout.Content>
    </PageLayout>
  );
};
