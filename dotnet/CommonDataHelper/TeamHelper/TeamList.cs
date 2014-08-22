using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.SyracuseTeamHelper.Model;
using CommonDataHelper.TeamHelper;

namespace CommonDataHelper
{
    public class TeamList
    {
        public List<TeamItem> createTeamList()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            string page = baseUrl.ToString() + @"sdata/syracuse/collaboration/syracuse/teams?representation=teams.$query&count=200";

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;

            string responseJson = webHelper.getServerJson(page, out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            List<TeamItem> teamsList = new List<TeamItem>();
            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                /*
                 * When one or more teams are selected, the payload sent to the server includes the entire team item json, and not just the Uuid
                 * We'll therefore get the json for each team item, then extract the description separately for displaying in the drop down.
                 */
                var teams = Newtonsoft.Json.JsonConvert.DeserializeObject<TeamsModel>(responseJson);

                foreach (object team in teams.teams)
                {
                    string teamDescription = Newtonsoft.Json.JsonConvert.DeserializeObject<TeamModel>(team.ToString()).description;
                    teamsList.Add(new TeamItem(teamDescription, team.ToString()));
                }

            }
            return teamsList;
        }
    }
}
