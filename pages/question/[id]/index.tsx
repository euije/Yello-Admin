/* eslint-disable react-hooks/rules-of-hooks */
import Menu from "@/component/Menu";
import TopBar from "@/component/TopBar";
import { pallete } from "@/styles/Color";
import {
  BodyLarge,
  BodyMedium,
  Headline_00,
  Headline_01,
  Headline_02,
  LabelLarge,
  Subtitle_01,
  Subtitle_02,
} from "@/styles/Typography";
import {
  ActionList,
  Button,
  FormControl,
  Radio,
  RadioGroup,
  Spinner,
  TextInput,
} from "@primer/react";
import axios, { AxiosError } from "axios";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";

interface User {
  id: number;
  name: string;
  yelloId: string;
  group: string;
  imageUrl: string;
  createdAt: string;
  deletedAt: string;
}

interface UserResponse {
  pageCount: number;
  totalCount: number;
  userList: User[];
}

interface QuestionDetail {
  id: number;
  nameHead: string;
  nameFoot: string;
  keywordHead: string;
  keywordFoot: string;
  keywordList: string[];
}

// interface VoteRequest {
//   questionId: number;
//   senderId: number;
//   receiverId: number;
//   keyword: string;
//   colorIndex: number;
// }

interface Vote {
  sender?: User;
  receiver?: User;
  keyword?: string;
  colorIndex: number;
}

interface Response<T> {
  status: number;
  message: string;
  data: T;
}

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL;

const index = () => {
  const [senderPage, setSenderPage] = useState(0);
  const [receiverPage, setReceiverPage] = useState(0);
  const [userList, setUserList] = useState<User[]>([]);
  const [lastSender, setLastSender] = useState<HTMLDivElement | null>(null);
  const [lastReceiver, setLastReceiver] = useState<HTMLDivElement | null>(null);
  const [currentVote, setCurrentVote] = useState<Vote>({ colorIndex: 1 });
  const [voteList, setVoteList] = useState<Vote[]>([]);
  const router = useRouter();

  const questionDetailFetcher = async ({ queryKey }: { queryKey: any }) => {
    const [_key, { questionId }] = queryKey;
    return axios
      .get(`${BASE_URL}/api/v1/admin/question/${questionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })
      .then((res) => {
        return res.data;
      });
  };

  const userFetcher = async ({ queryKey }: { queryKey: any }) => {
    const [_key, { page, field, value }] = queryKey;

    let params: any = { page };

    if (field !== "" && value !== "") {
      params.field = field;
      params.value = value;
    }

    return axios
      .get(`${BASE_URL}/api/v1/admin/user`, {
        params: params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })
      .then((res) => res.data);
  };

  const { isLoading, isError, data, error } = useQuery<
    Response<QuestionDetail>,
    AxiosError<Response<QuestionDetail>>
  >(["questionDetail", { questionId: router.query.id }], questionDetailFetcher);

  const result = useQuery<
    Response<UserResponse>,
    AxiosError<Response<UserResponse>>
  >(
    [
      "user",
      { page: Math.max(senderPage, receiverPage), field: "yelloId", value: "" },
    ],
    userFetcher,
    {
      retry: false,
    },
  );

  useEffect(() => {
    let observer: IntersectionObserver;
    if (lastSender) {
      observer = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setSenderPage(senderPage + 1);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 },
      );
      observer.observe(lastSender);
    }
    return () => observer && observer.disconnect();
  }, [lastSender]);

  useEffect(() => {
    let observer: IntersectionObserver;
    if (lastReceiver) {
      observer = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setReceiverPage(receiverPage + 1);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 },
      );
      observer.observe(lastReceiver);
    }
    return () => observer && observer.disconnect();
  }, [lastReceiver]);

  useEffect(() => {
    if (result.isSuccess) {
      setUserList([...userList.concat(result.data?.data.userList)]);
    }
  }, [result.isSuccess, senderPage, receiverPage]);

  if (
    (result.isLoading || isLoading) &&
    senderPage === 0 &&
    receiverPage === 0
  ) {
    return (
      <Spinner size={"large"} sx={{ padding: "300px 400px 300px 400px" }} />
    );
  }

  if (result.isError || isError) {
    return (
      <>
        <div
          style={{
            backgroundColor: pallete.semantic_red_100,
            padding: "100px 150px 100px 150px",
            borderRadius: "20px",
          }}
        >
          <Headline_00>에러</Headline_00>
          <Subtitle_01 style={{ color: pallete.semantic_red_500 }}>
            {error?.response?.data?.message}
          </Subtitle_01>
        </div>
      </>
    );
  }

  if (router.query.id === undefined) {
    return (
      <Spinner size={"large"} sx={{ padding: "300px 400px 300px 400px" }} />
    );
  }

  const onClickDelete = (questionId: number) => {
    if (confirm(questionId + "를 삭제하시겠습니까?")) {
      axios
        .delete(`${BASE_URL}/api/v1/admin/question`, {
          params: {
            questionId: questionId,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
        .then((res) => {
          alert(res.data.message);
          router.back();
        })
        .catch((reason) => {
          alert(reason.response.data.message);
        });
    }
  };

  const onClickVoteSend = () => {
    if (
      confirm(
        voteList.length +
          "개의 투표를 전송하시겠습니까?\n남발하는 투표는 자제합시다",
      )
    ) {
      const voteContentList = voteList.map((vote) => {
        return {
          senderId: vote.sender?.id,
          receiverId: vote.receiver?.id,
          keyword: vote.keyword,
          colorIndex: vote.colorIndex,
        };
      });
      axios
        .post(
          `${BASE_URL}/api/v1/admin/question/${router.query.id}`,
          {
            voteContentList: voteContentList,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          },
        )
        .then((res) => {
          alert(res.data.message);
          setVoteList([]);
        })
        .catch((reason) => {
          alert(reason.response.data.message);
        });
    }
  };

  return (
    <>
      <TopBar router={router} />
      <div style={{ display: "flex" }}>
        <Menu />
        <div
          style={{
            width: "100%",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "20px 100px 20px 100px",
              marginTop: "20px",
              backgroundColor: pallete.grayscales_100,
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Button
              sx={{ backgroundColor: pallete.semantic_green_500 }}
              onClick={() => {
                router.push("/question");
              }}
            >
              {"이전"}
            </Button>

            <div style={{ display: "flex", flexDirection: "row" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Headline_00 style={{ marginTop: "40px" }}>
                  {"기본 정보"}
                </Headline_00>
                <div style={{ display: "flex", padding: "10px 0 10px 0" }}>
                  <Subtitle_01 style={{ width: "150px" }}>{"ID"}</Subtitle_01>
                  <BodyLarge>{data?.data.id}</BodyLarge>
                </div>
                <div style={{ display: "flex", padding: "10px 0 10px 0" }}>
                  <Subtitle_01 style={{ width: "150px" }}>
                    {"섹션1"}
                  </Subtitle_01>
                  <BodyLarge>{data?.data.nameHead}</BodyLarge>
                </div>
                <div style={{ display: "flex", padding: "10px 0 10px 0" }}>
                  <Subtitle_01 style={{ width: "150px" }}>
                    {"섹션2"}
                  </Subtitle_01>
                  <BodyLarge>{data?.data.nameFoot}</BodyLarge>
                </div>
                <div style={{ display: "flex", padding: "10px 0 10px 0" }}>
                  <Subtitle_01 style={{ width: "150px" }}>
                    {"섹션3"}
                  </Subtitle_01>
                  <BodyLarge>{data?.data.keywordHead}</BodyLarge>
                </div>
                <div style={{ display: "flex", padding: "10px 0 10px 0" }}>
                  <Subtitle_01 style={{ width: "150px" }}>
                    {"섹션4"}
                  </Subtitle_01>
                  <BodyLarge>{data?.data.keywordFoot}</BodyLarge>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: "100px",
                }}
              >
                <Headline_00 style={{ marginTop: "40px" }}>
                  {"키워드"}
                </Headline_00>
                {data?.data.keywordList.map((keyword, index) => {
                  return (
                    <div
                      key={keyword + index}
                      style={{ display: "flex", padding: "10px 0 10px 0" }}
                    >
                      <Subtitle_01 style={{ width: "150px" }}>
                        {`키워드${index + 1}`}
                      </Subtitle_01>
                      <BodyLarge>{keyword}</BodyLarge>
                    </div>
                  );
                })}
              </div>
              {/* <Button
              sx={{ backgroundColor: pallete.yello_main_500 }}
              onClick={() => router.push(`/user/${data?.data.id}/edit`)}
            >
              {"수정"}
            </Button> */}
            </div>
            <Button
              sx={{ backgroundColor: pallete.semantic_red_500 }}
              onClick={() => onClickDelete(data?.data.id as number)}
            >
              {"삭제"}
            </Button>

            <div
              style={{
                width: "100%",
                borderTop: `1px solid ${pallete.grayscales_800}`,
                margin: "32px 0 32px 0",
              }}
            ></div>
            <Headline_00 style={{ marginTop: "40px" }}>
              {"해당 투표 보내기"}
            </Headline_00>
            <Subtitle_02>
              {
                "유의사항\n - 쿨타임X\n - 푸쉬알람O\n - 악용X\n - 키워드 커스텀 가능"
              }
            </Subtitle_02>

            <Headline_02 style={{ marginTop: "40px" }}>
              {"보낼 투표 리스트"}
            </Headline_02>
            {voteList.map((vote, index) => {
              return (
                <ActionList.Item
                  key={vote.keyword! + index}
                  sx={{ backgroundColor: pallete.vote_color[vote.colorIndex] }}
                >
                  <ActionList.LeadingVisual>
                    <Headline_00>{index + 1}</Headline_00>
                  </ActionList.LeadingVisual>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "200px",
                        height: "40px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "white",
                      }}
                      onClick={() => {}}
                    >
                      <Headline_02
                        style={{ width: "50px", marginLeft: "16px" }}
                      >
                        {vote.sender?.id}
                      </Headline_02>

                      <Image
                        src={vote.sender?.imageUrl!}
                        alt={"image"}
                        width={24}
                        height={24}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Subtitle_02
                          style={{ marginLeft: "12px", width: "80px" }}
                        >
                          {"@" + vote.sender?.yelloId}
                        </Subtitle_02>
                        <BodyMedium style={{ marginLeft: "30px" }}>
                          {vote.sender?.name}
                        </BodyMedium>
                      </div>
                    </div>
                    <div style={{ fontSize: "36px" }}>{"→"}</div>
                    <div
                      style={{
                        width: "200px",
                        height: "40px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "white",
                      }}
                      onClick={() => {}}
                    >
                      <Headline_02
                        style={{ width: "50px", marginLeft: "16px" }}
                      >
                        {vote.receiver?.id}
                      </Headline_02>

                      <Image
                        src={vote.receiver?.imageUrl!}
                        alt={"image"}
                        width={24}
                        height={24}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Subtitle_02
                          style={{ marginLeft: "12px", width: "80px" }}
                        >
                          {"@" + vote.receiver?.yelloId}
                        </Subtitle_02>
                        <BodyMedium style={{ marginLeft: "30px" }}>
                          {vote.receiver?.name}
                        </BodyMedium>
                      </div>
                    </div>

                    <div
                      style={{
                        width: "300px",
                        padding: "18px 0 18px 0",
                        borderRadius: "32px",
                        backgroundColor: pallete.black,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div>
                        <Headline_00
                          style={{
                            color: pallete.white,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {(data?.data.nameHead === null
                            ? ""
                            : data?.data.nameHead) +
                            " 너" +
                            data?.data.nameFoot}
                        </Headline_00>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "center",
                        }}
                      >
                        <Headline_00
                          style={{
                            color: pallete.white,
                          }}
                        >
                          {" "}
                          {(data?.data.keywordHead === null
                            ? ""
                            : data?.data.keywordHead) + " "}
                        </Headline_00>
                        <BodyLarge
                          style={{
                            backgroundColor: pallete.yello_main_500,
                            color: pallete.black,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {vote.keyword}
                        </BodyLarge>
                        <Headline_00
                          style={{
                            color: pallete.white,
                          }}
                        >
                          {data?.data.keywordFoot}
                        </Headline_00>
                      </div>
                    </div>
                  </div>
                </ActionList.Item>
              );
            })}

            <Button
              sx={{ backgroundColor: pallete.semantic_green_500 }}
              onClick={() => {
                onClickVoteSend();
              }}
            >
              {"전송"}
            </Button>
            <Headline_02 style={{ marginTop: "40px" }}>
              {"보낼 투표 만들기"}
            </Headline_02>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: pallete.grayscales_400,
                padding: "10px 10px 10px 10px",
              }}
            >
              <div
                style={{
                  height: "100px",
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                <div style={{ width: "300px" }}>
                  <Subtitle_01>{"보내는이"}</Subtitle_01>
                  {currentVote?.sender && (
                    <div
                      style={{
                        width: "300px",
                        height: "80px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "white",
                      }}
                      onClick={() => {}}
                    >
                      <Headline_02
                        style={{ width: "50px", marginLeft: "16px" }}
                      >
                        {currentVote?.sender.id}
                      </Headline_02>

                      <Image
                        src={currentVote?.sender.imageUrl!}
                        alt={"image"}
                        width={48}
                        height={48}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Subtitle_02
                          style={{ marginLeft: "12px", width: "150px" }}
                        >
                          {"@" + currentVote?.sender?.yelloId}
                        </Subtitle_02>
                        <BodyMedium style={{ marginLeft: "30px" }}>
                          {currentVote?.sender?.name}
                        </BodyMedium>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginLeft: "30px" }}>
                  <Subtitle_01>{"받는이"}</Subtitle_01>
                  {currentVote?.receiver && (
                    <div
                      style={{
                        width: "300px",
                        height: "80px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "white",
                      }}
                      onClick={() => {}}
                    >
                      <Headline_02
                        style={{ width: "50px", marginLeft: "16px" }}
                      >
                        {currentVote?.receiver.id}
                      </Headline_02>

                      <Image
                        src={currentVote?.receiver.imageUrl!}
                        alt={"image"}
                        width={48}
                        height={48}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Subtitle_02
                          style={{ marginLeft: "12px", width: "150px" }}
                        >
                          {"@" + currentVote?.receiver?.yelloId}
                        </Subtitle_02>
                        <BodyMedium style={{ marginLeft: "30px" }}>
                          {currentVote?.receiver?.name}
                        </BodyMedium>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: "36px" }}>
                <Subtitle_01>{"키워드"}</Subtitle_01>
                <TextInput
                  aria-label="yelloKeyword"
                  name="yelloKeyword"
                  placeholder="투표 키워드를 입력해주세요"
                  autoComplete="yelloKeyword"
                  value={currentVote.keyword}
                  onChange={(e) => {
                    setCurrentVote({
                      ...currentVote,
                      keyword: e.target.value,
                    });
                  }}
                  sx={{
                    width: "350px",
                    height: "50px",
                  }}
                />
              </div>
              <Subtitle_01 style={{ marginTop: "36px" }}>
                {"투표 색깔"}
              </Subtitle_01>
              <div
                style={{
                  width: "600px",
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                }}
              >
                {pallete.vote_color.map((color, index) => {
                  if (index !== 0) {
                    return (
                      <div
                        key={color + index}
                        style={{ margin: "10px 10px 10px 10px" }}
                      >
                        <FormControl>
                          <Radio
                            name={"radio" + color}
                            value={String(index)}
                            checked={currentVote.colorIndex === index}
                            onChange={(e) => {
                              setCurrentVote({
                                ...currentVote,
                                colorIndex: index,
                              });
                            }}
                          />
                          <FormControl.Label sx={{ backgroundColor: color }}>
                            {`${index}번 : ${color}`}
                          </FormControl.Label>
                        </FormControl>
                      </div>
                    );
                  }
                })}
              </div>
              <Button
                sx={{ backgroundColor: pallete.semantic_yellow_500 }}
                onClick={() => {
                  if (
                    currentVote.colorIndex &&
                    currentVote.keyword &&
                    currentVote.receiver &&
                    currentVote.sender
                  ) {
                    setVoteList([...voteList, currentVote]);
                    setCurrentVote({ colorIndex: 1 });
                  } else {
                    alert("투표를 완성해주세요");
                  }
                }}
              >
                {"추가"}
              </Button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                margin: "32px 0 0 0",
              }}
            >
              <Headline_02>{"보내는 사람"}</Headline_02>
              <Headline_02 style={{ marginLeft: "240px" }}>
                {"받는 사람"}
              </Headline_02>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
              }}
            >
              <BodyMedium>{"클릭해서 선택하세요"}</BodyMedium>
              <BodyMedium style={{ marginLeft: "210px" }}>
                {"클릭해서 선택하세요"}
              </BodyMedium>
            </div>

            <div style={{ display: "flex", flexDirection: "row" }}>
              <div
                style={{
                  width: "300px",
                  height: "400px",
                  overflowY: "scroll",
                  backgroundColor: `${pallete.white}`,
                  marginRight: "30px",
                }}
              >
                {userList.length === 0 ? (
                  <></>
                ) : (
                  userList.map((user: User, index: number) => {
                    return (
                      <>
                        <div
                          key={user?.id + index}
                          style={{
                            width: "300px",
                            height: "80px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                          onClick={() => {
                            setCurrentVote({ ...currentVote, sender: user });
                          }}
                          ref={
                            userList.length - 1 === index
                              ? setLastSender
                              : undefined
                          }
                        >
                          <Headline_02
                            style={{ width: "50px", marginLeft: "16px" }}
                          >
                            {user?.id}
                          </Headline_02>

                          <Image
                            src={user.imageUrl}
                            alt={"image"}
                            width={48}
                            height={48}
                          />
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <Subtitle_02
                              style={{ marginLeft: "12px", width: "150px" }}
                            >
                              {"@" + user?.yelloId}
                            </Subtitle_02>
                            <BodyMedium style={{ marginLeft: "30px" }}>
                              {user?.name}
                            </BodyMedium>
                          </div>
                        </div>
                      </>
                    );
                  })
                )}
              </div>
              <div
                style={{
                  width: "300px",
                  height: "400px",
                  overflowY: "scroll",
                  backgroundColor: `${pallete.white}`,
                }}
              >
                {userList.length === 0 ? (
                  <></>
                ) : (
                  userList.map((user: User, index: number) => {
                    return (
                      <>
                        <div
                          key={user?.id + index}
                          style={{
                            width: "300px",
                            height: "80px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                          onClick={() => {
                            setCurrentVote({ ...currentVote, receiver: user });
                          }}
                          ref={
                            userList.length - 1 === index
                              ? setLastReceiver
                              : undefined
                          }
                        >
                          <Headline_02
                            style={{ width: "50px", marginLeft: "16px" }}
                          >
                            {user?.id}
                          </Headline_02>

                          <Image
                            src={user.imageUrl}
                            alt={"image"}
                            width={48}
                            height={48}
                          />
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <Subtitle_02
                              style={{ marginLeft: "12px", width: "150px" }}
                            >
                              {"@" + user?.yelloId}
                            </Subtitle_02>
                            <BodyMedium style={{ marginLeft: "30px" }}>
                              {user?.name}
                            </BodyMedium>
                          </div>
                        </div>
                      </>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default index;
