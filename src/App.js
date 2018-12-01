import React, { Component } from 'react';
import axios from 'axios';
import { normalize, schema } from 'normalizr';
import { BrowserRouter, Route } from 'react-router-dom';

import ResultsTable from './components/ResultsTable/ResultsTable';
import Admin from './components/Admin/Admin';

import 'react-table/react-table.css';
import './App.css';

const franchise = new schema.Entity('franchises');

const projectedScore = new schema.Entity(
  'projectedScores',
  {},
  {
    processStrategy: projectedScore => ({
      ...projectedScore,
      score: Number.parseFloat(projectedScore.score) || 0,
    }),
  }
);

const liveScore = new schema.Entity(
  'liveScores',
  {},
  {
    processStrategy: liveScore => ({
      ...liveScore,
      score: Number.parseFloat(liveScore.score),
      gameSecondsRemaining: Number.parseInt(liveScore.gameSecondsRemaining, 10),
      playersYetToPlay: Number.parseInt(liveScore.playersYetToPlay, 10),
    }),
  }
);

const player = new schema.Entity('players');
const division = new schema.Entity('divisions');

const dataSchema = new schema.Object({
  league: {
    league: {
      franchises: {
        franchise: new schema.Array(franchise),
      },
      divisions: {
        division: new schema.Array(division),
      },
    },
  },
  liveScores: {
    liveScoring: {
      matchup: new schema.Array({
        franchise: new schema.Array(liveScore),
      }),
      franchise: new schema.Array(liveScore),
    },
  },
  projectedScores: {
    projectedScores: {
      playerScore: new schema.Array(projectedScore),
    },
  },
  players: {
    players: {
      player: new schema.Array(player),
    },
  },
});

class App extends Component {
  state = {
    entities: {},
    data: {},
  };

  componentDidMount() {
    const LeagueID = 10507;
    const Year = 2018;
    const Week = 13;
    const apiUrl =
      'https://cors-anywhere.herokuapp.com/https://api.myfantasyleague.com/' +
      Year +
      '/export?JSON=1';
    const LeagueIDParam = '&L=' + LeagueID;
    const WeekParam = '&W=' + Week;

    const PlayersUrl = apiUrl + '&TYPE=players';
    const LeagueUrl = apiUrl + '&TYPE=league' + LeagueIDParam;
    const ProjectedScoresUrl =
      apiUrl + '&TYPE=projectedScores' + LeagueIDParam + WeekParam + '&COUNT=99999';
    const LiveScoringUrl = apiUrl + '&TYPE=liveScoring' + LeagueIDParam + WeekParam;

    var rootJsonData = {};

    Promise.all([
      axios.get(PlayersUrl).then(({ data }) => (rootJsonData.players = data)),
      axios.get(LeagueUrl).then(({ data }) => (rootJsonData.league = data)),
      axios.get(ProjectedScoresUrl).then(({ data }) => (rootJsonData.projectedScores = data)),
      axios.get(LiveScoringUrl).then(({ data }) => (rootJsonData.liveScores = data)),
    ]).then(() => {
      const { entities, result } = normalize(rootJsonData, dataSchema);
      this.setState({
        entities,
        data: result,
      });
    });
  }

  render() {
    return (
      <BrowserRouter basename="/playoff-tracker/">
        <div className="app">
          <Route exact path="/" render={() => <ResultsTable {...this.state} />} />
          <Route path="/admin" render={() => <Admin {...this.state} />} />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
