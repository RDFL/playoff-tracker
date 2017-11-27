import React, { Component } from 'react';
import axios from 'axios';
import { normalize, schema } from 'normalizr';
import ReactTable from 'react-table';

import Loading from './components/Loading/Loading';

import 'react-table/react-table.css';
import './App.css';

const SECONDS_IN_GAME = 3600;
const NUM_ADVANCING = 6;

const franchise = new schema.Entity('franchises');
const player = new schema.Entity(
    'players',
    {},
    {
        processStrategy: player => ({
            ...player,
            score: Number.parseFloat(player.score),
            gameSecondsRemaining: Number.parseInt(player.gameSecondsRemaining, 10)
        })
    }
);
const projectedScore = new schema.Entity(
    'projectedScores',
    {},
    {
        processStrategy: projectedScore => ({
            ...projectedScore,
            score: Number.parseFloat(projectedScore.score) || 0
        })
    }
);
const liveScore = new schema.Entity(
    'liveScores',
    {
        players: {
            player: new schema.Array(player)
        }
    },
    {
        processStrategy: liveScore => ({
            ...liveScore,
            score: Number.parseFloat(liveScore.score),
            gameSecondsRemaining: Number.parseInt(liveScore.gameSecondsRemaining, 10),
            playersYetToPlay: Number.parseInt(liveScore.playersYetToPlay, 10)
        })
    }
);

const dataSchema = new schema.Object({
    league: {
        league: {
            franchises: {
                franchise: new schema.Array(franchise)
            }
        }
    },
    liveScores: {
        liveScoring: {
            matchup: new schema.Array({
                franchise: new schema.Array(liveScore)
            })
        }
    },
    projectedScores: {
        projectedScores: {
            playerScore: new schema.Array(projectedScore)
        }
    }
});

const columns = [
    {
        Header: 'Name',
        accessor: 'name'
    },
    {
        id: 'score',
        Header: 'Score',
        accessor: d => d.score
    },
    {
        id: 'projectedScore',
        Header: 'Projected Score',
        accessor: d => Math.round(d.projectedScore * 100) / 100
    },
    {
        id: 'projectedToAdvance',
        Header: 'Projected To Advance',
        accessor: d => (d.projectedToAdvance ? 'Yes' : 'No')
    }
];

class App extends Component {
    state = {
        entities: {},
        data: {}
    };

    componentDidMount() {
        axios.get('https://mfl-api.herokuapp.com/').then(({ data }) => {
            const { entities, result } = normalize(data, dataSchema);
            this.setState({
                entities,
                data: result
            });
        });
    }

    getProjectedScore(franchiseId) {
        const { projectedScores, liveScores, players } = this.state.entities;
        const { players: playerIds } = liveScores[franchiseId];
        const starters = playerIds.player.filter(playerId => players[playerId].status === 'starter');
        return starters.reduce((liveTeamProjection, playerId) => {
            const { gameSecondsRemaining, score } = players[playerId];
            const { score: projectedScore } = projectedScores[playerId];
            const projectionWeight = gameSecondsRemaining / SECONDS_IN_GAME;
            const livePlayerProjection = score + projectionWeight * projectedScore;
            return liveTeamProjection + livePlayerProjection;
        }, 0);
    }

    getTableData() {
        const { franchises, liveScores } = this.state.entities;
        if (franchises) {
            const allProjectedScores = [];
            const tableData = Object.keys(franchises).map(franchiseId => {
                const { name } = franchises[franchiseId];
                const { score } = liveScores[franchiseId];
                const projectedScore = this.getProjectedScore(franchiseId);
                allProjectedScores.push(projectedScore);
                return { name, score, projectedScore };
            });
            allProjectedScores.sort((a, b) => a - b).reverse();
            return tableData.map(data => ({
                ...data,
                projectedToAdvance: data.projectedScore >= allProjectedScores[NUM_ADVANCING - 1]
            }));
        }
        return [];
    }

    render() {
        const tableData = this.getTableData();
        return (
            <div className="app">
                {tableData.length === 0 ? (
                    <Loading />
                ) : (
                    <ReactTable
                        data={tableData}
                        columns={columns}
                        showPagination={false}
                        showPageSizeOptions={false}
                        defaultPageSize={tableData.length}
                        defaultSorted={[{ id: 'projectedScore', desc: true }]}
                    />
                )}
            </div>
        );
    }
}

export default App;
