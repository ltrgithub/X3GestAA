using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.SyracuseTeamHelper.Model;

namespace CommonDataHelper
{
    public class TeamHelper
    {
        public List<string> createTeamList()
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

            List<string> teamsList = new List<string>();
            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                var syracuseTeams = Newtonsoft.Json.JsonConvert.DeserializeObject<SyracuseTeams>(responseJson);

                foreach (SyracuseTeam syracuseTeam in syracuseTeams.teams)
                {
                    teamsList.Add(syracuseTeam.description);
                }

            }
            return teamsList;
        }
    }
}
